import ast
import os
import unittest


class TestDebugPromptIsolation(unittest.TestCase):
    def test_all_debug_create_session_calls_disable_custom_instructions(self):
        host_dir = os.path.dirname(__file__)
        for filename in (
            "debug_auth.py",
            "debug_bisect.py",
            "debug_sdk_direct.py",
        ):
            with self.subTest(filename=filename):
                path = os.path.join(host_dir, filename)
                with open(path, "r", encoding="utf-8") as stream:
                    tree = ast.parse(stream.read(), filename=filename)
                calls = [
                    node
                    for node in ast.walk(tree)
                    if isinstance(node, ast.Call)
                    and isinstance(node.func, ast.Attribute)
                    and node.func.attr == "create_session"
                ]
                self.assertTrue(calls)
                for call in calls:
                    keyword = next(
                        (
                            item
                            for item in call.keywords
                            if item.arg == "skip_custom_instructions"
                        ),
                        None,
                    )
                    self.assertIsNotNone(keyword)
                    self.assertIsInstance(keyword.value, ast.Constant)
                    self.assertIs(keyword.value.value, True)


if __name__ == "__main__":
    unittest.main()
