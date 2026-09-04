import { postNativeMessageWire } from './nativeMessageWire'
import { ownDataProperty } from '../utils/ownData'

export const UPDATE_STATE_KEY = 'dh_update_state'
export const UPDATE_ALARM_NAME = 'dh-reliable-update-resume'
export const STATUS_HOST_NAME = 'com.dynamics.helper.update_status'

const ERROR_MESSAGES = Object.freeze({
  invalid_update_request: 'The update request is invalid.',
  installation_integrity_failed: 'The installed Host and Extension do not match. Run the matching full installer.',
  update_already_in_progress: 'Another update is already in progress.',
  update_prepare_failed: 'The update could not be prepared. Retry or run the matching full installer.',
  update_activation_failed: 'The prepared update could not be started. Retry or run the matching full installer.',
  update_not_terminal: 'The update has not finished yet.',
  update_cleanup_failed: 'The update finished but cleanup is incomplete. Retry cleanup.',
  source_update_disabled: 'Automatic update is disabled while the source Host is registered.',
  manual_recovery_required: 'Automatic recovery could not finish. Run the matching full installer.',
})

export type UpdateErrorCode = keyof typeof ERROR_MESSAGES

export interface UpdateCandidate {
  readonly version: string
  readonly url: string
  readonly isPrerelease: boolean
}

export interface UpdateStatus {
  readonly transactionId: string
  readonly phase: string
  readonly targetVersion: string
  readonly reasonCode: string | null
}

export interface FinalizationReceipt {
  readonly transactionId: string
  readonly outcome: 'committed' | 'rolled-back'
  readonly terminal_version: Readonly<{
    fresh_install: boolean
    version: string | null
  }>
  readonly state: 'finalized-awaiting-ack'
}

export interface UpdateTransaction {
  readonly update: UpdateCandidate
  readonly transactionId: string
  readonly targetVersion: string
  readonly priorVersion: string
}

export interface VerifiedUpdateProduct {
  readonly version: string
  readonly mode: 'packaged' | 'development'
}

export type UpdateState =
  | Readonly<{ kind: 'idle' }>
  | Readonly<{ kind: 'available'; update: UpdateCandidate }>
  | Readonly<({ kind: 'preparing'; errorCode?: UpdateErrorCode } & UpdateTransaction)>
  | Readonly<({ kind: 'activating'; activationRetryUsed: boolean; errorCode?: UpdateErrorCode } & UpdateTransaction)>
  | Readonly<({
      kind: 'polling'
      lastStatus: UpdateStatus | null
      lastProgressAt: number
      recoveryKick: 'unused' | 'pending' | 'confirmed'
    } & UpdateTransaction)>
  | Readonly<({ kind: 'reload-pending'; outcome: 'committed' | 'rolled-back'; errorCode?: UpdateErrorCode } & UpdateTransaction)>
  | Readonly<({ kind: 'ack-pending'; receipt: FinalizationReceipt; errorCode?: UpdateErrorCode } & UpdateTransaction)>
  | Readonly<{ kind: 'complete'; update: UpdateCandidate; transactionId: string; outcome: 'committed' | 'rolled-back' }>
  | Readonly<{
      kind: 'recovery-required'
      code: UpdateErrorCode
      action: 'resume' | 'verify-terminal' | 'recheck-installation'
      transaction?: UpdateTransaction
    }>

export interface NativePendingRequest {
  readonly requestId: string
  readonly response: Promise<unknown>
  cancel(): void
}

export interface UpdateRuntimeDeps {
  requestMain(message: Readonly<Record<string, unknown>>): NativePendingRequest
  requestStatus(message: Readonly<Record<string, unknown>>): NativePendingRequest
  createTransactionId(): string
  now(): number
  sleep(milliseconds: number): Promise<void>
  kickRecovery(): Promise<void>
  broadcast(state: UpdateState): Promise<void>
  requestFreshCheck(): Promise<void>
  freshWorkerVersion: string
  workerInstanceId: string
  getVerifiedProduct(): Promise<VerifiedUpdateProduct | null>
  verifyInstalled(
    transaction: UpdateTransaction,
    outcome: 'committed' | 'rolled-back',
  ): Promise<boolean>
}

type ParsedAction<T> = Readonly<
  | { ok: true; data: T }
  | { ok: false; errorCode: UpdateErrorCode }
>

type StatusErrorCode =
  | 'invalid_request'
  | 'unknown_action'
  | 'unknown_transaction'
  | 'invalid_journal_phase'
  | 'invalid_journal_reason'

type ParsedStatusAction = Readonly<
  | { ok: true; data: UpdateStatus }
  | { ok: false; errorCode: StatusErrorCode }
>

const SEMVER_RE = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-((?:0|[1-9][0-9]*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9][0-9]*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))*))?$/
const TX_RE = /^[0-9a-f]{32}$/
const PHASES = new Set([
  'staging',
  'prepared',
  'waiting-for-host-exit',
  'host-backed-up',
  'host-installed',
  'extension-backed-up',
  'extension-installed',
  'metadata-installed',
  'probing',
  'committed',
  'rolling-back',
  'rolled-back',
  'recovery-required',
])
const REASONS = new Set([
  'host_exit_wait_failed',
  'host_backup_failed',
  'host_install_failed',
  'extension_backup_failed',
  'extension_install_failed',
  'metadata_install_failed',
  'startup_probe_failed',
  'locked_path',
  'rollback_failed',
  'manual_recovery_required',
])

function snapshotDataObject(value: unknown): Record<string, unknown> | null {
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
    const descriptors = Object.getOwnPropertyDescriptors(value)
    if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string')) return null
    const result: Record<string, unknown> = Object.create(null)
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return null
      result[key] = descriptor.value
    }
    return result
  } catch {
    return null
  }
}

function exactObject(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  const snapshot = snapshotDataObject(value)
  if (!snapshot || Object.keys(snapshot).length !== keys.length) return null
  if (keys.some(key => !Object.hasOwn(snapshot, key))) return null
  return snapshot
}

function optionalExactObject(
  value: unknown,
  required: readonly string[],
  optional: readonly string[],
): Record<string, unknown> | null {
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
    const descriptors = Object.getOwnPropertyDescriptors(value)
    if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string')) return null
    const present = Object.keys(descriptors)
    if (required.some(key => !present.includes(key))) return null
    if (present.some(key => !required.includes(key) && !optional.includes(key))) return null
    return exactObject(value, present)
  } catch {
    return null
  }
}

function normalizeTagVersion(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null
  const normalized = value.startsWith('v') || value.startsWith('V')
    ? value.slice(1)
    : value
  return SEMVER_RE.test(normalized) ? normalized : null
}

function internalVersion(value: unknown): string | null {
  if (typeof value !== 'string' || !SEMVER_RE.test(value)) return null
  return value
}

function parseVersion(value: string): readonly [readonly [string, string, string], readonly string[]] | null {
  const match = SEMVER_RE.exec(value)
  if (!match) return null
  return [
    [match[1], match[2], match[3]],
    match[4] ? match[4].split('.') : [],
  ]
}

function compareNumericIdentifier(left: string, right: string): number {
  if (left === right) return 0
  if (left.length !== right.length) return left.length < right.length ? -1 : 1
  return left < right ? -1 : 1
}

function comparePrerelease(left: readonly string[], right: readonly string[]): number {
  if (left.length === 0 || right.length === 0) {
    if (left.length === right.length) return 0
    return left.length === 0 ? 1 : -1
  }
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const l = left[index]
    const r = right[index]
    if (l === r) continue
    const lNumeric = /^[0-9]+$/.test(l)
    const rNumeric = /^[0-9]+$/.test(r)
    if (lNumeric && rNumeric) return compareNumericIdentifier(l, r)
    if (lNumeric !== rNumeric) return lNumeric ? -1 : 1
    return l < r ? -1 : 1
  }
  return left.length < right.length ? -1 : left.length === right.length ? 0 : 1
}

export function isStrictlyNewerVersion(target: unknown, prior: unknown): boolean {
  if (typeof target !== 'string' || typeof prior !== 'string') return false
  const parsedTarget = parseVersion(target)
  const parsedPrior = parseVersion(prior)
  if (!parsedTarget || !parsedPrior) return false
  for (let index = 0; index < 3; index += 1) {
    const compared = compareNumericIdentifier(
      parsedTarget[0][index],
      parsedPrior[0][index],
    )
    if (compared !== 0) return compared > 0
  }
  return comparePrerelease(parsedTarget[1], parsedPrior[1]) > 0
}

export function parseTransactionId(value: unknown): string | null {
  return typeof value === 'string' && TX_RE.test(value) ? value : null
}

function parseHttpsZipUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null
  try {
    const parsed = new URL(value)
    if (
      parsed.protocol !== 'https:'
      || parsed.username
      || parsed.password
      || parsed.hash
      || !parsed.pathname.toLowerCase().endsWith('.zip')
    ) return null
    return value
  } catch {
    return null
  }
}

export function parseUpdateCandidate(value: unknown): UpdateCandidate | null {
  const parsed = exactObject(value, ['version', 'url', 'isPrerelease'])
  if (!parsed || typeof parsed.isPrerelease !== 'boolean') return null
  const version = normalizeTagVersion(parsed.version)
  const url = parseHttpsZipUrl(parsed.url)
  if (!version || !url) return null
  return Object.freeze({ version, url, isPrerelease: parsed.isPrerelease })
}

function parsePersistedCandidate(value: unknown): UpdateCandidate | null {
  const parsed = exactObject(value, ['version', 'url', 'isPrerelease'])
  if (!parsed || typeof parsed.isPrerelease !== 'boolean') return null
  const version = internalVersion(parsed.version)
  const url = parseHttpsZipUrl(parsed.url)
  if (!version || !url) return null
  return Object.freeze({ version, url, isPrerelease: parsed.isPrerelease })
}

function parseErrorCode(value: unknown): UpdateErrorCode | null {
  return typeof value === 'string' && Object.hasOwn(ERROR_MESSAGES, value)
    ? value as UpdateErrorCode
    : null
}

function parseStatus(value: unknown): UpdateStatus | null {
  const parsed = exactObject(value, [
    'transactionId',
    'phase',
    'targetVersion',
    'reasonCode',
  ])
  if (!parsed) return null
  const transactionId = parseTransactionId(parsed.transactionId)
  const targetVersion = internalVersion(parsed.targetVersion)
  if (
    !transactionId
    || !targetVersion
    || typeof parsed.phase !== 'string'
    || !PHASES.has(parsed.phase)
    || !(parsed.reasonCode === null || (
      typeof parsed.reasonCode === 'string' && REASONS.has(parsed.reasonCode)
    ))
  ) return null
  return Object.freeze({
    transactionId,
    phase: parsed.phase,
    targetVersion,
    reasonCode: parsed.reasonCode as string | null,
  })
}

export function parseFinalizationReceipt(value: unknown): FinalizationReceipt | null {
  const parsed = exactObject(value, [
    'transactionId',
    'outcome',
    'terminal_version',
    'state',
  ])
  if (!parsed) return null
  const transactionId = parseTransactionId(parsed.transactionId)
  const terminal = exactObject(parsed.terminal_version, ['fresh_install', 'version'])
  if (
    !transactionId
    || (parsed.outcome !== 'committed' && parsed.outcome !== 'rolled-back')
    || parsed.state !== 'finalized-awaiting-ack'
    || !terminal
    || typeof terminal.fresh_install !== 'boolean'
    || !(terminal.version === null || internalVersion(terminal.version))
  ) return null
  if (
    parsed.outcome === 'committed'
    && terminal.version === null
    || parsed.outcome === 'rolled-back'
    && terminal.fresh_install === false
    && terminal.version === null
    || parsed.outcome === 'rolled-back'
    && terminal.fresh_install === true
    && terminal.version !== null
  ) return null
  const terminalVersion = Object.freeze({
    fresh_install: terminal.fresh_install,
    version: terminal.version as string | null,
  })
  return Object.freeze({
    transactionId,
    outcome: parsed.outcome,
    terminal_version: terminalVersion,
    state: 'finalized-awaiting-ack',
  })
}

function parseTransaction(value: unknown): UpdateTransaction | null {
  const parsed = exactObject(value, [
    'update',
    'transactionId',
    'targetVersion',
    'priorVersion',
  ])
  if (!parsed) return null
  const update = parsePersistedCandidate(parsed.update)
  const transactionId = parseTransactionId(parsed.transactionId)
  const targetVersion = internalVersion(parsed.targetVersion)
  const priorVersion = internalVersion(parsed.priorVersion)
  if (
    !update
    || !transactionId
    || !targetVersion
    || !priorVersion
    || targetVersion !== update.version
    || !isStrictlyNewerVersion(targetVersion, priorVersion)
  ) return null
  return Object.freeze({ update, transactionId, targetVersion, priorVersion })
}

function stateTransaction(parsed: Record<string, unknown>, extra: readonly string[]): UpdateTransaction | null {
  const value = exactObject(
    Object.fromEntries(['update', 'transactionId', 'targetVersion', 'priorVersion']
      .map(key => [key, parsed[key]])),
    ['update', 'transactionId', 'targetVersion', 'priorVersion'],
  )
  if (!value || extra.some(key => !Object.hasOwn(parsed, key))) return null
  return parseTransaction(value)
}

export function parseUpdateState(value: unknown): UpdateState | null {
  const snapshot = snapshotDataObject(value)
  if (!snapshot || typeof snapshot.kind !== 'string') return null
  const kind = snapshot.kind
  if (kind === 'idle') {
    return exactObject(snapshot, ['kind'])?.kind === 'idle'
      ? Object.freeze({ kind: 'idle' })
      : null
  }
  if (kind === 'available' || kind === 'complete') {
    const keys = kind === 'available'
      ? ['kind', 'update']
      : ['kind', 'update', 'transactionId', 'outcome']
    const parsed = exactObject(snapshot, keys)
    if (!parsed) return null
    const update = parsePersistedCandidate(parsed.update)
    if (!update) return null
    if (kind === 'available') return Object.freeze({ kind, update })
    const transactionId = parseTransactionId(parsed.transactionId)
    if (!transactionId) return null
    if (parsed.outcome !== 'committed' && parsed.outcome !== 'rolled-back') return null
    return Object.freeze({ kind, update, transactionId, outcome: parsed.outcome })
  }
  if (kind === 'recovery-required') {
    const parsed = optionalExactObject(
      snapshot,
      ['kind', 'code', 'action'],
      ['transaction'],
    )
    if (!parsed) return null
    const code = parseErrorCode(parsed.code)
    if (
      !code
      || !['resume', 'verify-terminal', 'recheck-installation'].includes(parsed.action as string)
    ) return null
    const transaction = Object.hasOwn(parsed, 'transaction')
      ? parseTransaction(parsed.transaction)
      : undefined
    if (Object.hasOwn(parsed, 'transaction') && !transaction) return null
    return Object.freeze({
      kind,
      code,
      action: parsed.action as 'resume' | 'verify-terminal' | 'recheck-installation',
      ...(transaction ? { transaction } : {}),
    })
  }

  const optional = [
    'preparing',
    'activating',
    'reload-pending',
    'ack-pending',
  ].includes(kind)
    ? ['errorCode']
    : []
  const extras = kind === 'preparing'
    ? []
    : kind === 'activating'
      ? ['activationRetryUsed']
      : kind === 'polling'
        ? ['lastStatus', 'lastProgressAt', 'recoveryKick']
        : kind === 'reload-pending'
          ? ['outcome']
          : kind === 'ack-pending'
            ? ['receipt']
            : null
  if (extras === null) return null
  const parsed = optionalExactObject(
    snapshot,
    ['kind', 'update', 'transactionId', 'targetVersion', 'priorVersion', ...extras],
    optional,
  )
  if (!parsed) return null
  const tx = stateTransaction(parsed, extras)
  if (!tx) return null
  const errorCode = Object.hasOwn(parsed, 'errorCode')
    ? parseErrorCode(parsed.errorCode)
    : undefined
  if (Object.hasOwn(parsed, 'errorCode') && !errorCode) return null
  if (kind === 'preparing') return Object.freeze({ kind, ...tx, ...(errorCode ? { errorCode } : {}) })
  if (kind === 'activating') {
    if (typeof parsed.activationRetryUsed !== 'boolean') return null
    return Object.freeze({ kind, ...tx, activationRetryUsed: parsed.activationRetryUsed, ...(errorCode ? { errorCode } : {}) })
  }
  if (kind === 'polling') {
    const lastStatus = parsed.lastStatus === null ? null : parseStatus(parsed.lastStatus)
    if (
      parsed.lastStatus !== null && !lastStatus
      || typeof parsed.lastProgressAt !== 'number'
      || !Number.isFinite(parsed.lastProgressAt)
      || parsed.lastProgressAt < 0
      || !['unused', 'pending', 'confirmed'].includes(parsed.recoveryKick as string)
      || lastStatus && (
        lastStatus.transactionId !== tx.transactionId
        || lastStatus.targetVersion !== tx.targetVersion
      )
    ) return null
    return Object.freeze({
      kind,
      ...tx,
      lastStatus,
      lastProgressAt: parsed.lastProgressAt,
      recoveryKick: parsed.recoveryKick as 'unused' | 'pending' | 'confirmed',
    })
  }
  if (kind === 'reload-pending') {
    if (parsed.outcome !== 'committed' && parsed.outcome !== 'rolled-back') return null
    return Object.freeze({
      kind,
      ...tx,
      outcome: parsed.outcome,
      ...(errorCode ? { errorCode } : {}),
    })
  }
  const receipt = parseFinalizationReceipt(parsed.receipt)
  if (
    !receipt
    || receipt.transactionId !== tx.transactionId
    || receipt.terminal_version.fresh_install
    || receipt.terminal_version.version !== (
      receipt.outcome === 'committed'
        ? tx.targetVersion
        : tx.priorVersion
    )
  ) return null
  return Object.freeze({
    kind: 'ack-pending',
    ...tx,
    receipt,
    ...(errorCode ? { errorCode } : {}),
  })
}

function parseActionEnvelope<T>(
  requestId: string,
  value: unknown,
  parseData: (value: unknown) => T | null,
): ParsedAction<T> | null {
  const snapshot = snapshotDataObject(value)
  if (!snapshot) return null
  if (snapshot.status === 'success') {
    const envelope = exactObject(snapshot, ['requestId', 'status', 'data'])
    if (!envelope || envelope.requestId !== requestId) return null
    const data = parseData(envelope.data)
    return data ? Object.freeze({ ok: true, data }) : null
  }
  if (snapshot.status === 'error') {
    const envelope = exactObject(snapshot, ['requestId', 'status', 'error_code', 'error'])
    if (!envelope || envelope.requestId !== requestId) return null
    const errorCode = parseErrorCode(envelope.error_code)
    if (!errorCode || envelope.error !== ERROR_MESSAGES[errorCode]) return null
    return Object.freeze({ ok: false, errorCode })
  }
  return null
}

function parsePreparedData(value: unknown) {
  const parsed = exactObject(value, ['state', 'transactionId', 'targetVersion', 'priorVersion'])
  if (!parsed) return null
  const transactionId = parseTransactionId(parsed.transactionId)
  const targetVersion = internalVersion(parsed.targetVersion)
  const priorVersion = internalVersion(parsed.priorVersion)
  if (
    parsed.state !== 'update_prepared'
    || !transactionId
    || !targetVersion
    || !priorVersion
    || !isStrictlyNewerVersion(targetVersion, priorVersion)
  ) return null
  return Object.freeze({ state: 'update_prepared' as const, transactionId, targetVersion, priorVersion })
}

function parseActivatedData(value: unknown) {
  const parsed = exactObject(value, ['state', 'transactionId'])
  const transactionId = parsed && parseTransactionId(parsed.transactionId)
  return parsed?.state === 'update_activated' && transactionId
    ? Object.freeze({ state: 'update_activated' as const, transactionId })
    : null
}

function parseAcknowledgedData(value: unknown) {
  const parsed = exactObject(value, ['transactionId', 'acknowledged'])
  const transactionId = parsed && parseTransactionId(parsed.transactionId)
  return transactionId && parsed?.acknowledged === true
    ? Object.freeze({ transactionId, acknowledged: true as const })
    : null
}

export function parsePrepareResponse(requestId: string, value: unknown) {
  return parseActionEnvelope(requestId, value, parsePreparedData)
}

export function parseActivateResponse(requestId: string, value: unknown) {
  return parseActionEnvelope(requestId, value, parseActivatedData)
}

export function parseFinalizeResponse(requestId: string, value: unknown) {
  return parseActionEnvelope(requestId, value, parseFinalizationReceipt)
}

export function parseAcknowledgeResponse(requestId: string, value: unknown) {
  return parseActionEnvelope(requestId, value, parseAcknowledgedData)
}

export function parseStatusResponse(requestId: string, value: unknown) {
  const snapshot = snapshotDataObject(value)
  if (!snapshot) return null
  if (snapshot.status === 'success') {
    const envelope = exactObject(snapshot, ['requestId', 'status', 'data'])
    if (!envelope || envelope.requestId !== requestId) return null
    const data = parseStatus(envelope.data)
    return data
      ? Object.freeze({ ok: true as const, data })
      : null
  }
  if (snapshot.status === 'error') {
    const envelope = exactObject(snapshot, ['requestId', 'status', 'error_code'])
    if (!envelope || envelope.requestId !== requestId) return null
    const allowed = new Set<StatusErrorCode>([
      'invalid_request',
      'unknown_action',
      'unknown_transaction',
      'invalid_journal_phase',
      'invalid_journal_reason',
    ])
    return typeof envelope.error_code === 'string'
      && allowed.has(envelope.error_code as StatusErrorCode)
      ? Object.freeze({
          ok: false as const,
          errorCode: envelope.error_code as StatusErrorCode,
        }) satisfies ParsedStatusAction
      : null
  }
  return null
}

export function createStatusPortSender() {
  return (message: Readonly<Record<string, unknown>>): NativePendingRequest => {
    const port = chrome.runtime.connectNative(STATUS_HOST_NAME)
    let resolve!: (value: unknown) => void
    let reject!: (reason?: unknown) => void
    const response = new Promise<unknown>((res, rej) => {
      resolve = res
      reject = rej
    })
    let requestId = ''
    let closed = false
    const onMessage = (value: unknown) => {
      const id = ownDataProperty(value, 'requestId')
      if (id.kind !== 'value' || id.value !== requestId) return
      cleanup()
      resolve(value)
    }
    const onDisconnect = () => {
      cleanup()
      reject(new Error('Update status Host disconnected.'))
    }
    const cleanup = () => {
      if (closed) return
      closed = true
      port.onMessage.removeListener(onMessage)
      port.onDisconnect.removeListener(onDisconnect)
      port.disconnect()
    }
    port.onMessage.addListener(onMessage)
    port.onDisconnect.addListener(onDisconnect)
    try {
      requestId = postNativeMessageWire(message, {
        createRequestId: () => crypto.randomUUID(),
        register: id => {
          requestId = id
        },
        unregister: () => undefined,
        postMessage: value => port.postMessage(value),
      })
    } catch (error) {
      try {
        cleanup()
      } catch {
        // Preserve the posting failure.
      }
      throw error
    }
    return Object.freeze({
      requestId,
      response,
      cancel: () => {
        if (closed) return
        cleanup()
        reject(new Error('Update status request cancelled.'))
      },
    })
  }
}

export interface UpdateRuntime {
  initialize(options?: Readonly<{
    resume?: boolean
    priorWorkerVersion?: string | null
    priorWorkerInstance?: string | null
  }>): Promise<UpdateState>
  resume(): Promise<UpdateState>
  acceptCandidate(value: unknown): Promise<UpdateState>
  clearAvailable(): Promise<UpdateState>
  start(): Promise<UpdateState>
  ordinaryMainHostAllowed(): Promise<boolean>
  beginOrdinaryMainHostRequest<T>(
    start: () => Promise<T>,
  ): Promise<Readonly<
    | { allowed: false }
    | { allowed: true; response: Promise<T> }
  >>
  registerAlarmListener(): void
  handleMessage(value: unknown): Promise<
    | Readonly<{ handled: true; state: UpdateState }>
    | Readonly<{ handled: false }>
  >
  getState(): UpdateState
}

function storageGet(keys: string | string[] | null): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, stored => {
      if (chrome.runtime.lastError) reject(new Error('Update storage read failed.'))
      else resolve(stored)
    })
  })
}

function storageSet(values: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(values, () => {
      if (chrome.runtime.lastError) reject(new Error('Update storage write failed.'))
      else resolve()
    })
  })
}

function storageRemove(keys: string | string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) reject(new Error('Update storage remove failed.'))
      else resolve()
    })
  })
}

function createTransaction(
  update: UpdateCandidate,
  transactionId: string,
  verifiedVersion: string,
): UpdateTransaction | null {
  const priorVersion = internalVersion(verifiedVersion)
  if (
    !priorVersion
    || !parseTransactionId(transactionId)
    || !isStrictlyNewerVersion(update.version, priorVersion)
  ) return null
  return Object.freeze({
    update,
    transactionId,
    targetVersion: update.version,
    priorVersion,
  })
}

function transactionFields(transaction: UpdateTransaction): UpdateTransaction {
  return Object.freeze({
    update: transaction.update,
    transactionId: transaction.transactionId,
    targetVersion: transaction.targetVersion,
    priorVersion: transaction.priorVersion,
  })
}

function prepareMessage(transaction: UpdateTransaction): Readonly<Record<string, unknown>> {
  return Object.freeze({
    action: 'perform_update',
    payload: Object.freeze({
      url: transaction.update.url,
      transactionId: transaction.transactionId,
      targetVersion: transaction.targetVersion,
    }),
  })
}

function activateMessage(transaction: UpdateTransaction): Readonly<Record<string, unknown>> {
  return Object.freeze({
    action: 'activate_update',
    payload: Object.freeze({ transactionId: transaction.transactionId }),
  })
}

function statusMessage(transaction: UpdateTransaction): Readonly<Record<string, unknown>> {
  return Object.freeze({
    action: 'get_update_status',
    payload: Object.freeze({ transactionId: transaction.transactionId }),
  })
}

function finalizeMessage(transaction: UpdateTransaction): Readonly<Record<string, unknown>> {
  return Object.freeze({
    action: 'finalize_update_status',
    payload: Object.freeze({ transactionId: transaction.transactionId }),
  })
}

function acknowledgeMessage(transaction: UpdateTransaction): Readonly<Record<string, unknown>> {
  return Object.freeze({
    action: 'acknowledge_update_finalization',
    payload: Object.freeze({ transactionId: transaction.transactionId }),
  })
}

function scheduleUpdateAlarm(): void {
  chrome.alarms.create(UPDATE_ALARM_NAME, { delayInMinutes: 0.5 })
}

function clearUpdateAlarm(): Promise<void> {
  return new Promise(resolve => {
    chrome.alarms.clear(UPDATE_ALARM_NAME, () => resolve())
  })
}

function updateStateNeedsAlarm(state: UpdateState): boolean {
  return state.kind === 'preparing'
    || state.kind === 'activating' && state.errorCode === undefined
    || ['polling', 'reload-pending', 'ack-pending'].includes(state.kind)
    || state.kind === 'recovery-required' && state.transaction !== undefined
}

async function synchronizeUpdateAlarm(state: UpdateState): Promise<void> {
  if (updateStateNeedsAlarm(state)) scheduleUpdateAlarm()
  else await clearUpdateAlarm()
}

export function createUpdateRuntime(deps: UpdateRuntimeDeps): UpdateRuntime {
  let state: UpdateState = Object.freeze({ kind: 'idle' })
  let hydrationSucceeded = false
  let queue = Promise.resolve()
  let alarmRegistered = false
  let reloadRequested = false
  let mayFinalizeReloadPending = true
  const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
    const run = queue.then(operation, operation)
    queue = run.then(() => undefined, () => undefined)
    return run
  }
  const persist = async (next: UpdateState) => {
    const parsed = parseUpdateState(next)
    if (!parsed) throw new Error('Invalid update state.')
    await storageSet({ [UPDATE_STATE_KEY]: parsed })
    state = parsed
    await synchronizeUpdateAlarm(state)
    try {
      await deps.broadcast(state)
    } catch {
      // Durable update state remains authoritative when no UI is listening.
    }
    return state
  }
  const ordinaryMainAllowedForState = (current: UpdateState): boolean => {
    if (!hydrationSucceeded) return false
    if (current.kind === 'activating' && current.errorCode === undefined) return false
    if (
      current.kind === 'polling'
      || current.kind === 'reload-pending'
      || current.kind === 'ack-pending'
    ) return false
    if (current.kind === 'recovery-required' && current.transaction) return false
    return true
  }
  const persistPreparingError = async (
    transaction: UpdateTransaction,
    errorCode: UpdateErrorCode,
  ) => persist({ kind: 'preparing', ...transactionFields(transaction), errorCode })
  const persistActivatingError = async (
    transaction: UpdateTransaction,
    activationRetryUsed: boolean,
    errorCode: UpdateErrorCode,
  ) => persist({
    kind: 'activating',
    ...transactionFields(transaction),
    activationRetryUsed,
    errorCode,
  })
  const awaitBeforeDeadline = async (
    pending: NativePendingRequest,
    deadline: number,
  ): Promise<Readonly<
    | { kind: 'resolved'; value: unknown }
    | { kind: 'rejected' }
    | { kind: 'timeout' }
  >> => {
    const remaining = deadline - deps.now()
    if (remaining <= 0) return Object.freeze({ kind: 'timeout' })
    return new Promise(resolve => {
      let settled = false
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        try {
          pending.cancel()
        } catch {
          // Timeout remains authoritative even if transport cleanup fails.
        }
        resolve(Object.freeze({ kind: 'timeout' }))
      }, remaining)
      void pending.response.then(
        value => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          resolve(Object.freeze({ kind: 'resolved', value }))
        },
        () => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          resolve(Object.freeze({ kind: 'rejected' }))
        },
      )
    })
  }
  const completeAcknowledgment = async (
    transaction: UpdateTransaction,
    receipt: FinalizationReceipt,
  ): Promise<UpdateState> => {
    let pending: NativePendingRequest
    try {
      pending = deps.requestMain(acknowledgeMessage(transaction))
    } catch {
      scheduleUpdateAlarm()
      return state
    }
    let raw: unknown
    const settled = await awaitBeforeDeadline(pending, deps.now() + 120_000)
    if (settled.kind !== 'resolved') {
      scheduleUpdateAlarm()
      return state
    }
    raw = settled.value
    const parsed = parseAcknowledgeResponse(pending.requestId, raw)
    if (!parsed) {
      return persist({
        kind: 'ack-pending',
        ...transactionFields(transaction),
        receipt,
        errorCode: 'update_cleanup_failed',
      })
    }
    if (
      !parsed.ok
      || parsed.data.transactionId !== transaction.transactionId
    ) {
      return persist({
        kind: 'ack-pending',
        ...transactionFields(transaction),
        receipt,
        errorCode: parsed && !parsed.ok
          ? parsed.errorCode
          : 'update_cleanup_failed',
      })
    }
    const complete = await persist({
      kind: 'complete',
      update: transaction.update,
      transactionId: transaction.transactionId,
      outcome: receipt.outcome,
    })
    await clearUpdateAlarm()
    return complete
  }
  const finalizeTerminal = async (
    transaction: UpdateTransaction,
    outcome: 'committed' | 'rolled-back',
  ): Promise<UpdateState> => {
    let pending: NativePendingRequest
    try {
      pending = deps.requestMain(finalizeMessage(transaction))
    } catch {
      scheduleUpdateAlarm()
      return state
    }
    let raw: unknown
    const settled = await awaitBeforeDeadline(pending, deps.now() + 120_000)
    if (settled.kind !== 'resolved') {
      scheduleUpdateAlarm()
      return state
    }
    raw = settled.value
    const parsed = parseFinalizeResponse(pending.requestId, raw)
    if (!parsed) {
      return persist({
        kind: 'reload-pending',
        ...transactionFields(transaction),
        outcome,
        errorCode: 'update_cleanup_failed',
      })
    }
    if (!parsed.ok) {
      return persist({
        kind: 'reload-pending',
        ...transactionFields(transaction),
        outcome,
        errorCode: parsed.errorCode,
      })
    }
    if (
      parsed.data.transactionId !== transaction.transactionId
      || parsed.data.outcome !== outcome
      || parsed.data.terminal_version.fresh_install
      || parsed.data.terminal_version.version !== (
        outcome === 'committed'
          ? transaction.targetVersion
          : transaction.priorVersion
      )
    ) {
      return persist({
        kind: 'recovery-required',
        code: 'update_cleanup_failed',
        action: 'verify-terminal',
        transaction: transactionFields(transaction),
      })
    }
    await persist({
      kind: 'ack-pending',
      ...transactionFields(transaction),
      receipt: parsed.data,
    })
    scheduleUpdateAlarm()
    return completeAcknowledgment(transaction, parsed.data)
  }
  const verifyAndFinalize = async (
    transaction: UpdateTransaction,
    outcome: 'committed' | 'rolled-back',
  ): Promise<UpdateState> => {
    let verified = false
    try {
      verified = await deps.verifyInstalled(transactionFields(transaction), outcome)
    } catch {
      verified = false
    }
    if (!verified) {
      return persist({
        kind: 'recovery-required',
        code: 'installation_integrity_failed',
        action: 'verify-terminal',
        transaction: transactionFields(transaction),
      })
    }
    return finalizeTerminal(transaction, outcome)
  }
  const resumeRecoveryRequired = async (
    current: Extract<UpdateState, { kind: 'recovery-required' }>,
  ): Promise<UpdateState> => {
    const transaction = current.transaction
    if (!transaction) return current
    let pending: NativePendingRequest
    try {
      pending = deps.requestStatus(statusMessage(transaction))
    } catch {
      scheduleUpdateAlarm()
      return current
    }
    const settled = await awaitBeforeDeadline(
      pending,
      deps.now() + 120_000,
    )
    if (settled.kind !== 'resolved') {
      scheduleUpdateAlarm()
      return current
    }
    const raw = settled.value
    const parsed = parseStatusResponse(pending.requestId, raw)
    if (parsed && !parsed.ok) {
      return persist({
        kind: 'recovery-required',
        code: 'manual_recovery_required',
        action: 'recheck-installation',
        transaction: transactionFields(transaction),
      })
    }
    if (
      !parsed
      || parsed.data.transactionId !== transaction.transactionId
      || parsed.data.targetVersion !== transaction.targetVersion
    ) {
      scheduleUpdateAlarm()
      return current
    }
    if (parsed.data.phase === 'committed' || parsed.data.phase === 'rolled-back') {
      if (current.action === 'resume') {
        const next = await persist({
          kind: 'reload-pending',
          ...transactionFields(transaction),
          outcome: parsed.data.phase,
        })
        reloadRequested = true
        chrome.runtime.reload()
        return next
      }
      return verifyAndFinalize(transaction, parsed.data.phase)
    }
    if (current.action === 'resume') {
      const polling = await persist({
        kind: 'polling',
        ...transactionFields(transaction),
        lastStatus: parsed.data,
        lastProgressAt: deps.now(),
        recoveryKick: 'pending',
      })
      try {
        await deps.kickRecovery()
        return persist({
          kind: 'polling',
          ...transactionFields(transaction),
          lastStatus: parsed.data,
          lastProgressAt: deps.now(),
          recoveryKick: 'confirmed',
        })
      } catch {
        scheduleUpdateAlarm()
        return polling
      }
    }
    scheduleUpdateAlarm()
    return current
  }
  const observeStatus = async (
    transaction: UpdateTransaction,
    current: Extract<UpdateState, { kind: 'polling' }>,
    deadline: number,
  ): Promise<UpdateState> => {
    let pending: NativePendingRequest
    try {
      pending = deps.requestStatus(statusMessage(transaction))
    } catch {
      scheduleUpdateAlarm()
      return current
    }
    const settled = await awaitBeforeDeadline(pending, deadline)
    if (settled.kind !== 'resolved') {
      scheduleUpdateAlarm()
      return current
    }
    const raw = settled.value
    const parsed = parseStatusResponse(pending.requestId, raw)
    if (parsed && !parsed.ok) {
      return persist({
        kind: 'recovery-required',
        code: 'manual_recovery_required',
        action: 'recheck-installation',
        transaction: transactionFields(transaction),
      })
    }
    if (
      !parsed
      || parsed.data.transactionId !== transaction.transactionId
      || parsed.data.targetVersion !== transaction.targetVersion
    ) {
      scheduleUpdateAlarm()
      return current
    }
    const status = parsed.data
    if (status.phase === 'committed' || status.phase === 'rolled-back') {
      const next = await persist({
        kind: 'reload-pending',
        ...transactionFields(transaction),
        outcome: status.phase,
      })
      reloadRequested = true
      chrome.runtime.reload()
      return next
    }
    if (status.phase === 'recovery-required') {
      const action = status.reasonCode === 'rollback_failed'
        ? 'resume'
        : 'recheck-installation'
      const next = await persist({
        kind: 'recovery-required',
        code: 'manual_recovery_required',
        action,
        transaction: transactionFields(transaction),
      })
      scheduleUpdateAlarm()
      return next
    }
    const progressed = current.lastStatus?.phase !== status.phase
    let next = await persist({
      kind: 'polling',
      ...transactionFields(transaction),
      lastStatus: status,
      lastProgressAt: progressed ? deps.now() : current.lastProgressAt,
      recoveryKick: progressed ? 'unused' : current.recoveryKick,
    }) as Extract<UpdateState, { kind: 'polling' }>
    if (
      !progressed
      && deps.now() - next.lastProgressAt >= 30_000
      && next.recoveryKick !== 'confirmed'
    ) {
      if (next.recoveryKick === 'unused') {
        next = await persist({
          kind: 'polling',
          ...transactionFields(transaction),
          lastStatus: status,
          lastProgressAt: next.lastProgressAt,
          recoveryKick: 'pending',
        }) as Extract<UpdateState, { kind: 'polling' }>
      }
      try {
        await deps.kickRecovery()
        next = await persist({
          kind: 'polling',
          ...transactionFields(transaction),
          lastStatus: status,
          lastProgressAt: next.lastProgressAt,
          recoveryKick: 'confirmed',
        }) as Extract<UpdateState, { kind: 'polling' }>
      } catch {
        scheduleUpdateAlarm()
        return next
      }
    }
    scheduleUpdateAlarm()
    return next
  }
  const pollWake = async (
    initial: Extract<UpdateState, { kind: 'polling' }>,
  ): Promise<UpdateState> => {
    const startedAt = deps.now()
    const deadline = startedAt + 120_000
    const delays = [250, 500, 1_000, 2_000]
    let delayIndex = 0
    let current = initial
    while (true) {
      if (deps.now() >= deadline) return current
      const observed = await observeStatus(current, current, deadline)
      if (observed.kind !== 'polling') return observed
      current = observed
      if (deps.now() - startedAt >= 120_000) return current
      try {
        await deps.sleep(delays[Math.min(delayIndex, delays.length - 1)])
      } catch {
        return current
      }
      delayIndex += 1
    }
  }
  const resumeActivating = async (
    current: Extract<UpdateState, { kind: 'activating' }>,
  ): Promise<UpdateState> => {
    let pending: NativePendingRequest
    try {
      pending = deps.requestStatus(statusMessage(current))
    } catch {
      scheduleUpdateAlarm()
      return current
    }
    const settled = await awaitBeforeDeadline(
      pending,
      deps.now() + 120_000,
    )
    if (settled.kind !== 'resolved') {
      scheduleUpdateAlarm()
      return current
    }
    const raw = settled.value
    const parsed = parseStatusResponse(pending.requestId, raw)
    if (parsed && !parsed.ok) {
      return persist({
        kind: 'recovery-required',
        code: 'manual_recovery_required',
        action: 'recheck-installation',
        transaction: transactionFields(current),
      })
    }
    if (
      !parsed
      || parsed.data.transactionId !== current.transactionId
      || parsed.data.targetVersion !== current.targetVersion
    ) {
      scheduleUpdateAlarm()
      return current
    }
    const status = parsed.data
    if (status.phase === 'prepared') {
      if (current.activationRetryUsed) {
        return persist({
          kind: 'activating',
          ...transactionFields(current),
          activationRetryUsed: true,
          errorCode: current.errorCode ?? 'update_activation_failed',
        })
      }
      if (!await retryVersionIsCurrent(current)) {
        return persistRetryVersionFailure(current)
      }
      return sendActivation(current, true)
    }
    if (status.phase === 'committed' || status.phase === 'rolled-back') {
      const next = await persist({
        kind: 'reload-pending',
        ...transactionFields(current),
        outcome: status.phase,
      })
      reloadRequested = true
      chrome.runtime.reload()
      return next
    }
    if (status.phase === 'recovery-required') {
      return persist({
        kind: 'recovery-required',
        code: 'manual_recovery_required',
        action: status.reasonCode === 'rollback_failed'
          ? 'resume'
          : 'recheck-installation',
        transaction: transactionFields(current),
      })
    }
    const polling = await persist({
      kind: 'polling',
      ...transactionFields(current),
      lastStatus: status,
      lastProgressAt: deps.now(),
      recoveryKick: 'unused',
    })
    scheduleUpdateAlarm()
    return polling
  }
  const sendActivation = async (
    transaction: UpdateTransaction,
    activationRetryUsed: boolean,
  ): Promise<UpdateState> => {
    const activating = await persist({
      kind: 'activating',
      ...transactionFields(transaction),
      activationRetryUsed,
    }) as Extract<UpdateState, { kind: 'activating' }>
    let pending: NativePendingRequest
    try {
      pending = deps.requestMain(activateMessage(transaction))
    } catch {
      return persistActivatingError(
        transaction,
        activationRetryUsed,
        'update_activation_failed',
      )
    }
    let raw: unknown
    const settled = await awaitBeforeDeadline(pending, deps.now() + 120_000)
    if (settled.kind !== 'resolved') {
      scheduleUpdateAlarm()
      return resumeActivating(activating)
    }
    raw = settled.value
    const parsed = parseActivateResponse(pending.requestId, raw)
    if (!parsed) {
      scheduleUpdateAlarm()
      return resumeActivating(activating)
    }
    if (!parsed.ok) {
      return persistActivatingError(
        transaction,
        activationRetryUsed,
        parsed.errorCode,
      )
    }
    if (parsed.data.transactionId !== transaction.transactionId) {
      scheduleUpdateAlarm()
      return resumeActivating(activating)
    }
    const polling = await persist({
      kind: 'polling',
      ...transactionFields(transaction),
      lastStatus: null,
      lastProgressAt: deps.now(),
      recoveryKick: 'unused',
    }) as Extract<UpdateState, { kind: 'polling' }>
    scheduleUpdateAlarm()
    return pollWake(polling)
  }
  const sendPreparation = async (
    transaction: UpdateTransaction,
    persistIntent: boolean,
  ): Promise<UpdateState> => {
    if (persistIntent) {
      await persist({ kind: 'preparing', ...transactionFields(transaction) })
    }
    let pending: NativePendingRequest
    try {
      pending = deps.requestMain(prepareMessage(transaction))
    } catch {
      return persistPreparingError(transaction, 'update_prepare_failed')
    }
    let raw: unknown
    const settled = await awaitBeforeDeadline(pending, deps.now() + 120_000)
    if (settled.kind !== 'resolved') {
      return persistPreparingError(transaction, 'update_prepare_failed')
    }
    raw = settled.value
    const parsed = parsePrepareResponse(pending.requestId, raw)
    if (!parsed) return persistPreparingError(transaction, 'invalid_update_request')
    if (!parsed.ok) return persistPreparingError(transaction, parsed.errorCode)
    if (
      parsed.data.transactionId !== transaction.transactionId
      || parsed.data.targetVersion !== transaction.targetVersion
      || parsed.data.priorVersion !== transaction.priorVersion
    ) return persistPreparingError(transaction, 'invalid_update_request')
    return sendActivation(transaction, false)
  }
  const verifiedProduct = async (): Promise<VerifiedUpdateProduct | null> => {
    try {
      const value = await deps.getVerifiedProduct()
      const version = internalVersion(value?.version)
      if (
        !version
        || value?.mode !== 'packaged' && value?.mode !== 'development'
      ) return null
      return Object.freeze({ version, mode: value.mode })
    } catch {
      return null
    }
  }
  const retryVersionIsCurrent = async (
    transaction: UpdateTransaction,
  ): Promise<boolean> => {
    const current = await verifiedProduct()
    return current?.mode === 'packaged'
      && current.version === transaction.priorVersion
      && isStrictlyNewerVersion(transaction.targetVersion, current.version)
  }
  const persistRetryVersionFailure = (
    transaction: UpdateTransaction,
  ): Promise<UpdateState> => persist({
    kind: 'recovery-required',
    code: 'installation_integrity_failed',
    action: 'recheck-installation',
    transaction: transactionFields(transaction),
  })
  const retryPreparation = async (
    transaction: UpdateTransaction,
  ): Promise<UpdateState> => {
    const current = await verifiedProduct()
    if (current?.mode === 'development') {
      return persist({
        kind: 'preparing',
        ...transactionFields(transaction),
        errorCode: 'source_update_disabled',
      })
    }
    if (
      current?.mode !== 'packaged'
      || current.version !== transaction.priorVersion
      || !isStrictlyNewerVersion(transaction.targetVersion, current.version)
    ) {
      return persistRetryVersionFailure(transaction)
    }
    await persist({
      kind: 'preparing',
      ...transactionFields(transaction),
    })
    scheduleUpdateAlarm()
    return sendPreparation(transaction, false)
  }
  const startCurrent = async (): Promise<UpdateState> => {
    if (
      state.kind === 'available'
      || state.kind === 'complete' && state.outcome === 'rolled-back'
    ) {
      const update = state.update
      const current = await verifiedProduct()
      if (current?.mode === 'development') {
        return persist({
          kind: 'recovery-required',
          code: 'source_update_disabled',
          action: 'recheck-installation',
        })
      }
      if (
        !current
        || !isStrictlyNewerVersion(update.version, current.version)
      ) {
        return persist({
          kind: 'recovery-required',
          code: 'installation_integrity_failed',
          action: 'recheck-installation',
        })
      }
      const transaction = createTransaction(
        update,
        deps.createTransactionId(),
        current.version,
      )
      if (!transaction) return state
      return sendPreparation(transaction, true)
    }
    if (state.kind === 'preparing') {
      return retryPreparation(state)
    }
    if (state.kind === 'activating') {
      return resumeActivating(state)
    }
    if (state.kind === 'recovery-required') {
      return resumeRecoveryRequired(state)
    }
    if (state.kind === 'reload-pending') {
      return verifyAndFinalize(state, state.outcome)
    }
    if (state.kind === 'ack-pending') {
      return completeAcknowledgment(state, state.receipt)
    }
    return state
  }
  const resumeCurrent = async (): Promise<UpdateState> => {
    if (state.kind === 'preparing' && state.errorCode === undefined) {
      return retryPreparation(state)
    }
    if (state.kind === 'polling') {
      return pollWake(state)
    }
    if (state.kind === 'activating' && state.errorCode === undefined) {
      return resumeActivating(state)
    }
    if (state.kind === 'reload-pending') {
      if (reloadRequested || !mayFinalizeReloadPending) return state
      return verifyAndFinalize(state, state.outcome)
    }
    if (state.kind === 'ack-pending') {
      return completeAcknowledgment(state, state.receipt)
    }
    if (state.kind === 'recovery-required') {
      return resumeRecoveryRequired(state)
    }
    return state
  }
  const alarmListener = (alarm: chrome.alarms.Alarm) => {
    if (alarm.name !== UPDATE_ALARM_NAME) return
    void serialize(resumeCurrent).catch(() => undefined)
  }
  return {
    initialize: options => serialize(async () => {
      mayFinalizeReloadPending = options?.priorWorkerVersion === undefined
        || options.priorWorkerInstance !== deps.workerInstanceId
      const stored = await storageGet([UPDATE_STATE_KEY, 'pending_update'])
      const property = ownDataProperty(stored, UPDATE_STATE_KEY)
      const legacyPresent = ownDataProperty(stored, 'pending_update').kind === 'value'
      const stateWasAbsent = property.kind === 'absent'
      if (property.kind === 'value') {
        const parsed = parseUpdateState(property.value)
        if (!parsed) throw new Error('Invalid update state.')
        state = parsed
      } else if (!stateWasAbsent) {
        throw new Error('Invalid update state.')
      }
      if (legacyPresent) {
        await storageRemove('pending_update')
      }
      const unavailableMarker = state.kind === 'recovery-required'
        && state.transaction === undefined
        && (
          state.code === 'installation_integrity_failed'
          || state.code === 'source_update_disabled'
        )
        && state.action === 'recheck-installation'
      const installerMarker = unavailableMarker
        && state.kind === 'recovery-required'
        && state.code === 'installation_integrity_failed'
      const safeState = state.kind === 'idle'
        || state.kind === 'available'
        || state.kind === 'complete'
        || unavailableMarker
      const shouldVerify = stateWasAbsent
        || state.kind === 'available'
        || state.kind === 'complete'
        || unavailableMarker
        || legacyPresent && safeState
      let requestFreshCheck = false
      if (shouldVerify) {
        const current = await verifiedProduct()
        if (!current) {
          if (!installerMarker) {
            await persist({
              kind: 'recovery-required',
              code: 'installation_integrity_failed',
              action: 'recheck-installation',
            })
          }
          hydrationSucceeded = true
          return state
        }
        if (current.mode === 'development') {
          if (state.kind === 'available' || unavailableMarker) {
            await persist({
              kind: 'recovery-required',
              code: 'source_update_disabled',
              action: 'recheck-installation',
            })
            hydrationSucceeded = true
            return state
          }
        } else if (
          state.kind === 'available'
          && !isStrictlyNewerVersion(state.update.version, current.version)
        ) {
          await persist({ kind: 'idle' })
          requestFreshCheck = true
        } else if (
          state.kind === 'complete'
          && options?.priorWorkerVersion !== undefined
          && options.priorWorkerVersion !== deps.freshWorkerVersion
        ) {
          await persist({ kind: 'idle' })
          requestFreshCheck = true
        }
        if (stateWasAbsent || unavailableMarker) {
          await persist({ kind: 'idle' })
          requestFreshCheck = true
        }
      }
      await synchronizeUpdateAlarm(state)
      if (
        (stateWasAbsent || legacyPresent && safeState || unavailableMarker || requestFreshCheck)
        && (state.kind === 'idle' || state.kind === 'available' || state.kind === 'complete')
      ) {
        try {
          await deps.requestFreshCheck()
        } catch {
          if (state.kind === 'idle') await storageRemove(UPDATE_STATE_KEY)
        }
      }
      hydrationSucceeded = true
      return options?.resume === false ? state : resumeCurrent()
    }),
    acceptCandidate: value => serialize(async () => {
      const update = parseUpdateCandidate(value)
      if (!update || !['idle', 'available', 'complete'].includes(state.kind)) {
        return state
      }
      if (
        state.kind === 'complete'
        && state.outcome === 'rolled-back'
        && state.update.version === update.version
      ) return state
      const current = await verifiedProduct()
      if (!current) {
        return persist({
          kind: 'recovery-required',
          code: 'installation_integrity_failed',
          action: 'recheck-installation',
        })
      }
      if (current.mode === 'development') {
        return persist({
          kind: 'recovery-required',
          code: 'source_update_disabled',
          action: 'recheck-installation',
        })
      }
      if (!isStrictlyNewerVersion(update.version, current.version)) return state
      return persist({ kind: 'available', update })
    }),
    clearAvailable: () => serialize(async () => state.kind === 'available'
      ? persist({ kind: 'idle' })
      : state),
    start: () => serialize(startCurrent),
    resume: () => serialize(resumeCurrent),
    ordinaryMainHostAllowed: () => !ordinaryMainAllowedForState(state)
      ? Promise.resolve(false)
      : serialize(async () => ordinaryMainAllowedForState(state)),
    beginOrdinaryMainHostRequest: start => !ordinaryMainAllowedForState(state)
      ? Promise.resolve(Object.freeze({ allowed: false as const }))
      : serialize(async () => {
      if (!ordinaryMainAllowedForState(state)) {
        return Object.freeze({ allowed: false as const })
      }
      return Object.freeze({
        allowed: true as const,
        response: start(),
      })
    }),
    registerAlarmListener: () => {
      if (alarmRegistered) return
      chrome.alarms.onAlarm.addListener(alarmListener)
      alarmRegistered = true
    },
    handleMessage: value => {
      const acknowledgment = exactObject(value, ['type', 'transactionId'])
      if (acknowledgment?.type === 'DH_UPDATE_ACK_COMPLETE') {
        const transactionId = parseTransactionId(acknowledgment.transactionId)
        if (!transactionId) {
          return Promise.resolve(Object.freeze({ handled: false as const }))
        }
        return serialize(async () => {
          if (state.kind === 'complete' && state.transactionId === transactionId) {
            await persist(state.outcome === 'committed'
              ? { kind: 'idle' }
              : { kind: 'available', update: state.update })
          }
          return Object.freeze({ handled: true as const, state })
        })
      }
      const parsed = exactObject(value, ['type'])
      if (!parsed || typeof parsed.type !== 'string') {
        return Promise.resolve(Object.freeze({ handled: false as const }))
      }
      if (parsed.type === 'DH_UPDATE_GET_STATE') {
        return Promise.resolve(Object.freeze({ handled: true as const, state }))
      }
      if (parsed.type === 'DH_UPDATE_START') {
        return serialize(async () => Object.freeze({
          handled: true as const,
          state: await startCurrent(),
        }))
      }
      return Promise.resolve(Object.freeze({ handled: false as const }))
    },
    getState: () => state,
  }
}
