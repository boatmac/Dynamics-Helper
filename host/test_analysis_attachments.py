"""Pure stdlib fixtures: fake readers/RPCs only, no SDK/CLI or real file I/O.

Not an execution approval or scanner profile. Review through the project gate
before running. Reader tests mock every filesystem operation, including open.
"""

import asyncio
import base64
from dataclasses import FrozenInstanceError, replace
import json
import os
import stat
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

import analysis_attachments as attachments
from analysis_attachments import prepare_attachments, qualify_images, read_download, report_notice


PNG = b"\x89PNG\r\n\x1a\nsynthetic"
JPEG = b"\xff\xd8\xffsynthetic\xff\xd9"


def path(name="private.txt"):
    return "C:\\downloads\\" + name if os.name == "nt" else "/downloads/" + name


def metadata(files=None, **changes):
    result = {"files": [] if files is None else files, "inventory": "known",
              "skipped": 0, "reason": "none", "language": "en"}
    result.update(changes)
    return result


def prepared_images():
    data = {path("private.png"): PNG, path("private.jpg"): JPEG, path(): b"text"}
    return prepare_attachments(metadata([{"path": name, "size": len(body)} for name, body in data.items()]),
                               read_file=lambda name, size: data[name])


def model(**vision_changes):
    vision = {"supported_media_types": ["image/png", "image/jpeg"],
              "max_prompt_images": 4, "max_prompt_image_size": attachments.MAX_FILE_BYTES}
    vision.update(vision_changes)
    return {"id": "actual-model", "capabilities": {"supports": {"vision": True},
                                                    "limits": {"vision": vision}}}


def typed(value):
    if type(value) is dict:
        return SimpleNamespace(**{key: typed(item) for key, item in value.items()})
    return value


class PreparationTests(unittest.TestCase):
    def test_raw_json_record_and_exact_text(self):
        body = b'\xef\xbb\xbf{"email":"person@example.test"}\r\n```\n'
        payload = json.loads(json.dumps(metadata([{"path": path("customer.JSON"), "size": len(body)}])))
        reader = Mock(return_value=body)
        result = prepare_attachments(payload, read_file=reader)
        reader.assert_called_once_with(path("customer.JSON"), len(body))
        self.assertIn(body.decode("utf-8"), result.text)
        self.assertIn("````text", result.text)
        self.assertIn("UNTRUSTED ATTACHMENT DATA", result.text)
        self.assertIn("attachment-1.json", result.text)
        self.assertNotIn("customer", result.text)
        self.assertEqual((result.supplied, result.skipped, result.images), (1, 0, []))
        with self.assertRaises(FrozenInstanceError):
            result.text = "changed"

    def test_every_text_extension_and_empty_text(self):
        for extension in ("txt", "log", "json", "xml", "csv", "md"):
            with self.subTest(extension=extension):
                result = prepare_attachments(metadata([{"path": path("x." + extension), "size": 0}]),
                                             read_file=Mock(return_value=b""))
                self.assertEqual((result.supplied, result.skipped), (1, 0))

    def test_reader_cannot_change_validated_metadata_snapshot(self):
        payload = metadata([{"path": path(), "size": 1}, {"path": path("b.txt"), "size": 1}])
        def reader(name, size):
            payload["files"].clear()
            payload["language"] = "private-invalid"
            payload["skipped"] = 99
            return b"x"
        result = prepare_attachments(payload, read_file=reader)
        self.assertEqual((result.supplied, result.skipped, result.language), (2, 0, "en"))

    def test_schema_rejected_before_any_read(self):
        valid = {"path": path(), "size": 1}
        class DictSubclass(dict):
            pass
        invalid = [None, [], "{}", DictSubclass(metadata()), metadata(extra=True),
                   {"files": []}, metadata(files=()), metadata(files=[valid] * 5),
                   metadata(inventory="bad"), metadata(reason="raw-private-reason"),
                   metadata(reason=None), metadata(reason=True), metadata(reason=[]),
                   metadata(reason="Folder_Unavailable"), metadata(reason="folder_unavailable "),
                   metadata(language="fr"), metadata(skipped=True), metadata(skipped=-1),
                   metadata(skipped=1.0), metadata(skipped=2**53),
                   metadata(files=[DictSubclass(valid)]), metadata(files=[dict(valid, extra=0)]),
                   metadata(files=[{"path": path()}])]
        for size in (True, -1, 1.0, float("nan"), float("inf"), attachments.MAX_FILE_BYTES + 1):
            invalid.append(metadata(files=[dict(valid, size=size)]))
        for bad in invalid:
            reader = Mock()
            with self.subTest(payload=bad), self.assertRaisesRegex(ValueError, "^invalid_attachment_metadata$"):
                prepare_attachments(bad, read_file=reader)
            reader.assert_not_called()
        for reason in ("none", "auth_timeout", "unavailable", "folder_unavailable", "download_failed", "stale"):
            reader = Mock(return_value=b"x")
            result = prepare_attachments(metadata([valid], reason=reason), read_file=reader)
            self.assertEqual((result.reason, result.supplied), (reason, 1))
            reader.assert_called_once_with(path(), 1)
            reader.reset_mock()
            with self.assertRaises(ValueError):
                prepare_attachments(metadata([valid, {"path": "relative.txt", "size": 1}], reason=reason),
                                    read_file=reader)
            reader.assert_not_called()

    def test_path_grammars_without_filesystem(self):
        windows_bad = [r"\\server\share\a.txt", r"\\?\C:\a.txt", r"\\.\C:\a.txt",
                       r"C:a.txt", r"\a.txt", r"C:\a.txt:stream", r"C:\..\a.txt",
                       r"C:\.\a.txt", "C:/a//b.txt", "C:/a./b.txt", "C:/a /b.txt",
                       "C:/NUL.txt", "C:/COM1.txt", "C:/LPT9", "C:/a?.txt", "/a.txt"]
        posix_bad = ["a.txt", "//server/a", "/a/../b", "/a/./b", "/a//b", "/a/", r"C:\a.txt"]
        for platform, good, bad in [("nt", r"C:\downloads\a.txt", windows_bad),
                                    ("posix", "/downloads/a.txt", posix_bad)]:
            with patch.object(attachments, "os", SimpleNamespace(name=platform)):
                self.assertEqual(attachments._validate_path(good), good)
                for candidate in bad + ["", None, good + "\x00", good + "\n", good + "x" * 512]:
                    with self.subTest(platform=platform, candidate=candidate), self.assertRaises(ValueError):
                        attachments._validate_path(candidate)
                prefix = "C:/" if platform == "nt" else "/"
                self.assertEqual(len(attachments._validate_path(prefix + "x" * (512 - len(prefix)))), 512)

    def test_count_and_byte_limits_inclusive(self):
        body = b"a" * attachments.MAX_FILE_BYTES
        files = [{"path": path(f"{index}.txt"), "size": len(body)} for index in range(4)]
        reader = Mock(return_value=body)
        result = prepare_attachments(metadata(files), read_file=reader)
        self.assertEqual((result.supplied, result.skipped, reader.call_count), (4, 0, 4))
        with patch.object(attachments, "MAX_TOTAL_BYTES", len(body)):
            reader.reset_mock()
            with self.assertRaises(ValueError):
                prepare_attachments(metadata(files[:2]), read_file=reader)
            reader.assert_not_called()

    def test_failures_continue_and_accumulate_upstream_skips(self):
        files = [{"path": path(name), "size": 1} for name in ("a.txt", "b.log", "c.csv", "d.md")]
        reader = Mock(side_effect=[OSError("private path"), b"\xff", b"xx", b"z"])
        result = prepare_attachments(metadata(files, skipped=2), read_file=reader)
        self.assertEqual((result.supplied, result.skipped, reader.call_count), (1, 5, 4))
        self.assertNotIn("private", result.text + report_notice(result))
        for body in (None, "x", bytearray(b"x")):
            result = prepare_attachments(metadata(files[:1]), read_file=Mock(return_value=body))
            self.assertEqual((result.supplied, result.skipped), (0, 1))

    def test_images_are_blob_snapshots_not_paths(self):
        result = prepared_images()
        self.assertEqual((result.supplied, result.skipped), (3, 0))
        for image, body, mime in zip(result.images, (PNG, JPEG), ("image/png", "image/jpeg")):
            self.assertEqual(set(image), {"type", "data", "mimeType", "displayName"})
            self.assertEqual(image["type"], "blob")
            self.assertEqual(image["mimeType"], mime)
            self.assertEqual(base64.b64decode(image["data"], validate=True), body)
            self.assertNotIn("private", json.dumps(image))

    def test_extension_signature_and_utf8_rejections(self):
        for name, body in [("x.png", JPEG), ("x.jpg", PNG), ("x.jpeg", b"\xff\xd8\xff"),
                           ("x.png", b""), ("x.txt", b"\xff")]:
            with self.subTest(name=name, body=body):
                result = prepare_attachments(metadata([{"path": path(name), "size": len(body)}]),
                                             read_file=Mock(return_value=body))
                self.assertEqual((result.supplied, result.skipped), (0, 1))
        reader = Mock()
        result = prepare_attachments(metadata([{"path": path("x.pdf"), "size": 1}]), read_file=reader)
        reader.assert_not_called()
        self.assertEqual(result.skipped, 1)

    def test_notices_counts_inventory_reasons_and_language(self):
        self.assertEqual(report_notice(prepare_attachments(metadata())), "")
        result = prepared_images()
        self.assertIn("Included: 3; skipped: 0", report_notice(result))
        self.assertIn("Included: 2; skipped: 1", report_notice(result, included_images=1))
        self.assertIn("partially", report_notice(result, included_images=1))
        self.assertIn("Review the attachments and analyze again if needed.",
                      report_notice(result, included_images=1))
        self.assertIn("工单附件未全部纳入本次分析，请查看附件，必要时重新分析。",
                      report_notice(replace(result, language="zh"), included_images=1))
        self.assertEqual((result.supplied, result.skipped, len(result.images)), (3, 0, 2))
        for language in ("en", "zh"):
            text_only = prepare_attachments(metadata([{"path": path(), "size": 1}],
                                                    skipped=1, language=language),
                                            read_file=Mock(return_value=b"x"))
            self.assertEqual(text_only.images, [])
            self.assertEqual(report_notice(text_only),
                             "> **Attachment status:** Attachments only partially available. Included: 1; skipped: 1."
                             " Not all case attachments were included in this analysis."
                             " Review the attachments and analyze again if needed." if language == "en" else
                             "> **附件状态：** 附件仅部分可用。已包含 1 个；已跳过 1 个。"
                             "工单附件未全部纳入本次分析，请查看附件，必要时重新分析。")
            for reason in attachments._REASONS:
                notice = report_notice(prepare_attachments(metadata(inventory="unknown", language=language, reason=reason)))
                if reason == "folder_unavailable":
                    self.assertEqual(notice,
                                     "> **Attachment status:** DTM did not list accessible files (the folder may be empty or access may be restricted); this analysis uses the case text."
                                     if language == "en" else
                                     "> **附件状态：** DTM 未列出可访问文件（目录可能为空或无访问权限），本次按工单文本分析。")
                    for inventory in ("known", "unknown"):
                        empty_folder = prepare_attachments(metadata(inventory=inventory, language=language, reason=reason))
                        self.assertEqual(report_notice(empty_folder, included_images=0), notice)
                        with self.assertRaises(ValueError):
                            report_notice(empty_folder, included_images=True)
                        for partial in (replace(empty_folder, skipped=1),
                                        replace(text_only, inventory=inventory, reason=reason, skipped=0),
                                        replace(result, inventory=inventory, language=language, reason=reason)):
                            partial_notice = report_notice(partial, included_images=0)
                            self.assertIn("Included:" if language == "en" else "已包含", partial_notice)
                            self.assertIn("DTM did not list accessible files" if language == "en" else
                                          "DTM 未列出可访问文件", partial_notice)
                            self.assertNotIn("this analysis uses the case text" if language == "en" else
                                             "本次按工单文本分析", partial_notice)
                            if inventory == "unknown":
                                self.assertIn("Cannot confirm whether the case has attachments" if language == "en" else
                                              "无法确认工单是否有附件", partial_notice)
                            elif partial.skipped or partial.images:
                                self.assertIn("Not all case attachments were included" if language == "en" else
                                              "工单附件未全部纳入本次分析", partial_notice)
                    continue
                self.assertIn("unknown" if language == "en" else "未知", notice)
                self.assertIn("Cannot confirm whether the case has attachments or whether all were included."
                              " Check the case attachments and analyze again if needed." if language == "en" else
                              "无法确认工单是否有附件或附件是否全部纳入本次分析，请检查工单附件，必要时重新分析。", notice)
                self.assertNotIn("Not all case attachments were included" if language == "en" else
                                 "工单附件未全部纳入本次分析", notice)
                if reason == "auth_timeout":
                    self.assertIn("30 seconds" if language == "en" else "30 秒", notice)
        for count in (-1, 3, True, 1.0):
            with self.assertRaises(ValueError):
                report_notice(result, included_images=count)


class AttachmentImportOwnerTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.payload = metadata([{"path": path(), "size": 1}], skipped=2)
        self.result = prepare_attachments(self.payload, read_file=Mock(return_value=b"x"))
        self.future = asyncio.get_running_loop().create_future()

        async def import_snapshot(snapshot):
            return await self.future

        self.importer = AsyncMock(side_effect=import_snapshot)
        self.owner = attachments.AttachmentImportOwner(importer=self.importer)
        self.to_thread = self.enterContext(patch.object(
            attachments.asyncio, "to_thread", new_callable=AsyncMock,
            side_effect=AssertionError("real threads forbidden")))

    async def asyncTearDown(self):
        task = self.owner._pending
        if task is not None:
            if not self.future.done():
                self.future.set_result(self.result)
            await asyncio.gather(task, return_exceptions=True)

    async def timeout(self):
        async def elapsed(tasks, *, timeout):
            await asyncio.sleep(0)
            return set(), tasks

        with patch.object(attachments.asyncio, "wait", new_callable=AsyncMock,
                          side_effect=elapsed) as wait:
            result = await self.owner.prepare(self.payload)
        wait.assert_awaited_once_with({self.owner._pending}, timeout=5.0)
        return result

    async def test_success_default_five_second_wait_and_synthetic_thread(self):
        self.owner = attachments.AttachmentImportOwner()
        self.to_thread.side_effect = None
        self.to_thread.return_value = self.result
        real_wait = asyncio.wait
        with patch.object(attachments.asyncio, "wait", wraps=real_wait) as wait:
            self.assertIs(await self.owner.prepare(self.payload), self.result)
        self.assertEqual(wait.await_args.kwargs, {"timeout": 5.0})
        self.assertEqual(len(wait.await_args.args[0]), 1)
        self.to_thread.assert_awaited_once_with(
            attachments._prepare_validated,
            attachments.validate_attachment_metadata(self.payload), attachments.read_download)
        self.assertIsNone(self.owner._pending)

    async def test_controlled_future_completes_within_wait(self):
        loop = asyncio.get_running_loop()
        handle = loop.call_later(0.01, self.future.set_result, self.result)
        try:
            self.assertIs(await self.owner.prepare(self.payload), self.result)
        finally:
            handle.cancel()
        self.importer.assert_awaited_once()
        self.to_thread.assert_not_called()
        self.assertIsNone(self.owner._pending)

    async def test_timeout_then_busy_keeps_one_task_and_fresh_counts(self):
        result = await self.timeout()
        task = self.owner._pending
        self.assertEqual(result, attachments.PreparedAttachments(
            "", [], 0, 3, "known", "unavailable", "en", "timeout"))
        current = metadata([{"path": path("new.txt"), "size": 1}] * 2,
                           skipped=4, inventory="unknown", language="zh")
        with patch.object(attachments.asyncio, "wait", new_callable=AsyncMock) as wait:
            busy = await self.owner.prepare(current)
        wait.assert_not_called()
        self.assertEqual(busy, attachments.PreparedAttachments(
            "", [], 0, 6, "unknown", "unavailable", "zh", "busy"))
        self.assertIsNot(busy, result)
        self.assertIs(self.owner._pending, task)
        self.assertFalse(task.done())
        self.assertFalse(self.future.cancelled())
        self.importer.assert_awaited_once()

    async def test_empty_never_imports_even_while_busy(self):
        for busy in (False, True):
            if busy:
                await self.timeout()
            task = self.owner._pending
            before = self.importer.call_count
            with patch.object(attachments.asyncio, "wait", new_callable=AsyncMock) as wait:
                for inventory, reason in (("known", "none"), ("unknown", "folder_unavailable")):
                    payload = metadata(inventory=inventory, reason=reason, language="zh")
                    self.assertEqual(await self.owner.prepare(payload), prepare_attachments(payload))
            wait.assert_not_called()
            self.assertEqual(self.importer.call_count, before)
            self.assertIs(self.owner._pending, task)
        self.to_thread.assert_not_called()

    async def test_invalid_metadata_rejected_before_empty_busy_or_wait(self):
        for busy in (False, True):
            if busy:
                await self.timeout()
            before = self.importer.call_count
            with patch.object(attachments.asyncio, "wait", new_callable=AsyncMock) as wait:
                for payload in (metadata(language="bad"), metadata(reason="timeout"),
                                metadata(files=[{"path": "relative.txt", "size": 1}]),
                                metadata(files=[{"path": path(), "size": True}])):
                    with self.assertRaisesRegex(ValueError, "^invalid_attachment_metadata$"):
                        await self.owner.prepare(payload)
            wait.assert_not_called()
            self.assertEqual(self.importer.call_count, before)
        self.to_thread.assert_not_called()

    async def test_late_exception_consumed_and_old_callback_cannot_clear_new_task(self):
        fallback = await self.timeout()
        old = self.owner._pending
        with patch.object(old, "exception", wraps=old.exception) as exception, self.assertNoLogs():
            self.future.set_exception(RuntimeError("private path and attachment content"))
            await asyncio.sleep(0)
            await asyncio.sleep(0)
            exception.assert_called_once_with()
        self.assertIsNone(self.owner._pending)
        self.future = asyncio.get_running_loop().create_future()
        await self.timeout()
        current = self.owner._pending
        self.owner._release(old)
        self.assertIs(self.owner._pending, current)
        fresh = replace(self.result, text="fresh result")
        self.future.set_result(fresh)
        await current
        await asyncio.sleep(0)
        self.assertEqual(fallback.import_issue, "timeout")
        # A finished late result is discarded, not a cache for the next invocation.
        newest = replace(self.result, text="new invocation")
        self.importer.side_effect = None
        self.importer.return_value = newest
        self.assertIs(await self.owner.prepare(self.payload), newest)
        self.assertEqual(self.importer.await_count, 3)

    async def test_caller_cancellation_propagates_and_keeps_slot(self):
        reached_after_prepare = Mock()

        async def caller():
            await self.owner.prepare(self.payload)
            reached_after_prepare()

        caller_task = asyncio.create_task(caller())
        await asyncio.sleep(0)
        task = self.owner._pending
        self.assertIsNotNone(task)
        caller_task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await caller_task
        reached_after_prepare.assert_not_called()
        self.assertIs(self.owner._pending, task)
        self.assertFalse(task.done())
        self.assertFalse(self.future.cancelled())
        self.assertEqual((await self.owner.prepare(self.payload)).import_issue, "busy")
        self.importer.assert_awaited_once()

    async def test_metadata_snapshot_immutable_before_importer_runs(self):
        async def mutate_before_worker(tasks, *, timeout):
            self.payload["files"][0]["path"] = "invalid"
            self.payload["files"][0]["size"] = 99
            self.payload["files"].clear()
            self.payload.update(inventory="unknown", reason="stale", language="zh", skipped=99)
            await asyncio.sleep(0)
            return set(), tasks

        with patch.object(attachments.asyncio, "wait", side_effect=mutate_before_worker):
            result = await self.owner.prepare(self.payload)
        snapshot = self.importer.await_args.args[0]
        self.assertEqual(snapshot, attachments.ValidatedAttachmentMetadata(
            ((path(), 1),), "known", "none", "en", 2))
        with self.assertRaises(FrozenInstanceError):
            snapshot.skipped = 99
        with self.assertRaises(TypeError):
            snapshot.descriptors[0][0] = "changed"
        self.assertEqual((result.skipped, result.inventory, result.language), (3, "known", "en"))

    async def test_immediate_import_failure_is_optional_not_schema_error(self):
        for error in (RuntimeError("private content"), ValueError("private path")):
            self.importer.side_effect = error
            with self.assertNoLogs():
                result = await self.owner.prepare(self.payload)
            self.assertEqual(result, attachments.PreparedAttachments(
                "", [], 0, 3, "known", "unavailable", "en", "failed"))
            self.assertIsNone(self.owner._pending)
            self.assertNotIn("private", report_notice(result))

    async def test_import_notices_bilingual_and_separate_from_auth_deadline(self):
        expected = {
            "timeout": ("Local attachment read wait exceeded 5 seconds", "附件本地读取等待超过5秒"),
            "busy": ("previous local attachment read is still pending", "上一次附件本地读取仍未结束"),
            "failed": ("Local attachment read failed", "附件本地读取失败"),
        }
        for issue, phrases in expected.items():
            for language, phrase in zip(("en", "zh"), phrases):
                result = attachments.PreparedAttachments("", [], 0, 3, "unknown", "unavailable", language, issue)
                notice = report_notice(result)
                self.assertIn(phrase, notice)
                self.assertIn("completeness cannot be confirmed" if language == "en" else
                              "不能确认是否完整", notice)
                self.assertIn("Included: 0; skipped: 3" if language == "en" else
                              "已包含 0 个；已跳过 3 个", notice)
                self.assertNotIn("30", notice)
                self.assertNotIn("cancel", notice)
                self.assertNotIn("取消", notice)
        self.assertIsNone(prepare_attachments(metadata()).import_issue)


class ReaderTests(unittest.TestCase):
    def setUp(self):
        self.file = SimpleNamespace(st_mode=stat.S_IFREG, st_dev=1, st_ino=2,
                                    st_size=3, st_mtime_ns=4, st_file_attributes=0)
        self.directory = SimpleNamespace(st_mode=stat.S_IFDIR, st_file_attributes=0)
        self.stream = Mock()
        self.stream.__enter__ = Mock(return_value=self.stream)
        self.stream.__exit__ = Mock(return_value=False)
        self.stream.fileno.return_value = 123
        self.stream.read.return_value = b"abc"
        self.lstat = self.enterContext(patch.object(attachments.os, "lstat", side_effect=
                                                  lambda name: self.file if name == path() else self.directory))
        self.open = self.enterContext(patch.object(attachments.os, "open", return_value=123))
        self.fdopen = self.enterContext(patch.object(attachments.os, "fdopen", return_value=self.stream))
        self.fstat = self.enterContext(patch.object(attachments.os, "fstat", return_value=self.file))
        self.close = self.enterContext(patch.object(attachments.os, "close"))

    def test_one_bounded_read_and_identity_checks(self):
        self.assertEqual(read_download(path(), 3), b"abc")
        self.stream.read.assert_called_once_with(attachments.MAX_FILE_BYTES + 1)
        self.assertEqual(self.fstat.call_count, 2)
        flags = os.O_RDONLY | getattr(os, "O_BINARY", 0) | getattr(os, "O_NOFOLLOW", 0)
        self.open.assert_called_once_with(path(), flags)
        self.fdopen.assert_called_once_with(123, "rb")
        self.stream.__exit__.assert_called_once()

    def test_ancestor_and_leaf_link_reparse_or_wrong_type(self):
        for target in (self.directory, self.file):
            original_mode = target.st_mode
            for mode, attributes in [(stat.S_IFLNK, 0), (original_mode, stat.FILE_ATTRIBUTE_REPARSE_POINT),
                                     (stat.S_IFIFO, 0)]:
                target.st_mode, target.st_file_attributes = mode, attributes
                with self.assertRaisesRegex(ValueError, "^attachment_read_failed$"):
                    read_download(path(), 3)
                self.open.assert_not_called()
            target.st_mode, target.st_file_attributes = original_mode, 0

    def test_replacement_or_mutation_before_and_after_read(self):
        for field in ("st_dev", "st_ino", "st_size", "st_mtime_ns"):
            changed = SimpleNamespace(**vars(self.file))
            setattr(changed, field, 99)
            for records in ([changed], [self.file, changed]):
                with self.subTest(field=field, records=len(records)):
                    self.fstat.side_effect = records
                    with self.assertRaises(ValueError):
                        read_download(path(), 3)
        self.fstat.side_effect = None
        self.lstat.side_effect = lambda name: self.directory if name != path() else (
            self.file if self.stream.read.call_count == 0 else changed)
        self.stream.read.reset_mock()
        with self.assertRaises(ValueError):
            read_download(path(), 3)

    def test_size_mismatch_and_read_failure_are_fixed(self):
        with self.assertRaises(ValueError):
            read_download(path(), 2)
        self.open.assert_not_called()
        for result in (b"ab", b"abcd"):
            self.stream.read.return_value = result
            with self.assertRaisesRegex(ValueError, "^attachment_read_failed$"):
                read_download(path(), 3)
        self.stream.read.side_effect = OSError("private path and body")
        with self.assertRaisesRegex(ValueError, "^attachment_read_failed$"):
            read_download(path(), 3)
        self.fdopen.side_effect = OSError("private path")
        with self.assertRaises(ValueError):
            read_download(path(), 3)
        self.close.assert_called_once_with(123)


class QualificationTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.prepared = prepared_images()
        self.current = AsyncMock(return_value=SimpleNamespace(model_id="actual-model"))
        self.session = SimpleNamespace(rpc=SimpleNamespace(model=SimpleNamespace(get_current=self.current)))
        self.client = SimpleNamespace(list_models=AsyncMock(return_value=[model()]))

    async def test_typed_and_dict_contracts_no_mutation(self):
        for current, models in [(SimpleNamespace(model_id="actual-model"), [typed(model())]),
                                ({"modelId": "actual-model"}, [model()]),
                                (SimpleNamespace(model_id="actual-model", auto_tier="standard"), [typed(model())]),
                                ({"modelId": "actual-model", "autoTier": "standard"}, [model()])]:
            self.current.return_value = current
            self.client.list_models.return_value = models
            result = await qualify_images(self.prepared, self.session, self.client)
            self.assertEqual(result, self.prepared.images)
            result[0]["data"] = "changed"
            self.assertNotEqual(result[0], self.prepared.images[0])
            self.assertEqual((self.prepared.supplied, self.prepared.skipped), (3, 0))

    async def test_no_images_no_rpc(self):
        result = await qualify_images(replace(self.prepared, images=[]), self.session, self.client)
        self.assertEqual(result, [])
        self.current.assert_not_called()
        self.client.list_models.assert_not_called()

    async def test_unknown_auto_and_invalid_current_skip_catalog(self):
        for current in (None, {}, {"modelId": True}, {"modelId": "auto"}, {"modelId": " "},
                        {"modelId": "auto", "autoTier": "standard"},
                        SimpleNamespace(model_id="auto", auto_tier="standard")):
            self.current.return_value = current
            self.assertEqual(await qualify_images(self.prepared, self.session, self.client), [])
        self.client.list_models.assert_not_called()

    async def test_exact_media_count_and_decoded_byte_limits(self):
        for limits, names in [({"max_prompt_images": 1}, ["attachment-1.png"]),
                              ({"supported_media_types": ["image/jpeg"]}, ["attachment-2.jpg"]),
                              ({"max_prompt_image_size": len(JPEG)}, ["attachment-2.jpg"]),
                              ({"max_prompt_image_size": len(JPEG) - 1}, []),
                              ({"supported_media_types": ["IMAGE/PNG"]}, [])]:
            self.client.list_models.return_value = [model(**limits)]
            result = await qualify_images(self.prepared, self.session, self.client)
            self.assertEqual([image["displayName"] for image in result], names)

    async def test_malformed_or_missing_capabilities_fail_closed(self):
        cases = [None, {}, [], [model(), model()], [{"id": "other", "capabilities": model()["capabilities"]}]]
        for support in (False, 1, "true", None):
            candidate = model()
            candidate["capabilities"]["supports"]["vision"] = support
            cases.append([candidate])
        for key in ("max_prompt_images", "max_prompt_image_size"):
            for value in (None, True, 0, -1, 1.0, float("inf"), float("nan"), 2**53):
                cases.append([model(**{key: value})])
        for media in (None, "image/png", [True], []):
            cases.append([model(supported_media_types=media)])
        cases.extend([[{"id": "actual-model"}], [{"id": "actual-model", "capabilities": {}}]])
        for models in cases:
            with self.subTest(models=models):
                self.client.list_models.return_value = models
                self.assertEqual(await qualify_images(self.prepared, self.session, self.client), [])

    async def test_errors_timeouts_and_cancellation(self):
        for method in (self.current, self.client.list_models):
            method.side_effect = RuntimeError("private diagnostic")
            self.assertEqual(await qualify_images(self.prepared, self.session, self.client), [])
            method.side_effect = None
        async def pending():
            await asyncio.Future()
        for method in (self.current, self.client.list_models):
            method.side_effect = pending
            with patch.object(attachments, "MODEL_TIMEOUT_SECONDS", 0.001):
                self.assertEqual(await qualify_images(self.prepared, self.session, self.client), [])
            method.side_effect = None
        self.current.side_effect = asyncio.CancelledError
        with self.assertRaises(asyncio.CancelledError):
            await qualify_images(self.prepared, self.session, self.client)

    async def test_each_rpc_has_three_second_budget(self):
        budgets = []
        async def capture(awaitable, timeout):
            budgets.append(timeout)
            return await awaitable
        with patch.object(attachments.asyncio, "wait_for", side_effect=capture):
            self.assertEqual(await qualify_images(self.prepared, self.session, self.client), self.prepared.images)
        self.assertEqual(budgets, [3.0, 3.0])
