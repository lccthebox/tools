const API_VERSION = 2;
const STORAGE_MODE = 'recordJson';
const SHEET_NAME = '기록';
const PRESET_SHEET = '반설정';
const RECORD_HEADERS = [
  'dateKey',
  'slotKey',
  'slotLabel',
  'dateLabel',
  'dayLabel',
  'savedAt',
  'classes',
  'recordJson'
];
const VALID_STATUSES = { draft: true, final: true };

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const data = parsePostData_(e);
    const action = stringValue_(data.action);

    if (action === 'list') {
      const authError = requireAuthorizedAction_(data);
      if (authError) return jsonOutput_(authError);
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      return jsonOutput_({ ok: true, apiVersion: API_VERSION, records: loadRecords_(ss) });
    }

    if (action === 'getPresets') {
      const authError = requireAuthorizedAction_(data);
      if (authError) return jsonOutput_(authError);
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      return jsonOutput_({ ok: true, presets: loadPresets_(ss) });
    }

    if (action === 'save') {
      const authError = requireAuthorizedAction_(data);
      if (authError) return jsonOutput_(authError);
      return jsonOutput_(saveRecord_(data.record || {}));
    }
    if (action === 'delete') {
      const authError = requireAuthorizedAction_(data);
      if (authError) return jsonOutput_(authError);
      return jsonOutput_(deleteRecord_(data.recordId, data.dateKey, data.slotKey));
    }
    if (action === 'savePresets') {
      const authError = requireAuthorizedAction_(data);
      if (authError) return jsonOutput_(authError);
      return jsonOutput_(savePresets_(data.presets));
    }

    return jsonOutput_({ ok: false, error: 'unknown_action' });
  } catch(err) {
    return jsonOutput_({ ok: false, error: errorMessage_(err) });
  } finally {
    try { lock.releaseLock(); } catch(ignore) {}
  }
}

function doGet(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : '';

    if (action === 'health') {
      return jsonOutput_({
        ok: true,
        apiVersion: API_VERSION,
        storage: STORAGE_MODE,
        sheetName: SHEET_NAME,
        supportsFinalGrouping: true,
        authRequired: isAuthRequired_()
      });
    }

    if (isAuthRequired_()) {
      return jsonOutput_({ ok: false, error: 'authentication_required' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'getPresets') {
      return jsonOutput_({ ok: true, presets: loadPresets_(ss) });
    }

    return jsonOutput_({ ok: true, apiVersion: API_VERSION, records: loadRecords_(ss) });
  } catch(err) {
    return jsonOutput_({ ok: false, error: errorMessage_(err) });
  }
}

function parsePostData_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('missing_post_body');
  }
  try {
    return JSON.parse(e.postData.contents);
  } catch(err) {
    throw new Error('invalid_json: ' + err.message);
  }
}

function jsonOutput_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorMessage_(err) {
  return err && err.message ? err.message : String(err);
}

function isAuthRequired_() {
  return !!getAccessToken_();
}

function getAccessToken_() {
  return stringValue_(PropertiesService.getScriptProperties().getProperty('ACCESS_TOKEN'));
}

function isAuthorizedRequest_(data) {
  if (!isAuthRequired_()) return true;
  const expected = getAccessToken_();
  const supplied = String(data && data.token ? data.token : '');
  return !!expected && supplied === expected;
}

function requireAuthorizedAction_(data) {
  return isAuthorizedRequest_(data) ? null : { ok: false, error: 'unauthorized' };
}

function getRecordSheet_(ss) {
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('missing_sheet: ' + SHEET_NAME);
  return sheet;
}

function ensureRecordJsonColumn_(sheet) {
  if (sheet.getMaxColumns() < RECORD_HEADERS.length) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      RECORD_HEADERS.length - sheet.getMaxColumns()
    );
  }
  const headerValues = sheet.getRange(1, 1, 1, RECORD_HEADERS.length).getValues()[0];
  const nextHeaders = RECORD_HEADERS.map(function(header, index) {
    return headerValues[index] || header;
  });
  if (nextHeaders[7] !== 'recordJson') nextHeaders[7] = 'recordJson';
  sheet.getRange(1, 1, 1, RECORD_HEADERS.length).setValues([nextHeaders]);
}

function readRecordRows_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const readableColumns = Math.max(7, Math.min(sheet.getMaxColumns(), RECORD_HEADERS.length));
  const values = sheet.getRange(2, 1, lastRow - 1, readableColumns).getValues();
  return values.map(function(row, index) {
    return rowToRecordEnvelope_(row, index + 2);
  });
}

function rowToRecordEnvelope_(row, rowNumber) {
  const legacy = {
    dateKey: stringValue_(row[0]),
    slotKey: stringValue_(row[1]),
    slotLabel: stringValue_(row[2]),
    dateLabel: stringValue_(row[3]),
    dayLabel: stringValue_(row[4]),
    savedAt: stringValue_(row[5]),
    classes: parseClasses_(row[6])
  };

  const recordJson = row.length >= 8 ? stringValue_(row[7]) : '';
  const parsed = recordJson ? safeJsonParse_(recordJson) : null;
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const record = normalizeV2Record_(parsed, legacy);
    return {
      rowNumber: rowNumber,
      record: record,
      dateKey: record.dateKey,
      slotKey: record.slotKey,
      recordId: record.recordId || '',
      isV2: true
    };
  }

  const record = normalizeLegacyRecord_(legacy, rowNumber);
  return {
    rowNumber: rowNumber,
    record: record,
    dateKey: record.dateKey,
    slotKey: record.slotKey,
    recordId: record.recordId || '',
    isV2: false
  };
}

function loadRecords_(ss) {
  return readRecordRows_(getRecordSheet_(ss)).map(function(row) {
    return row.record;
  });
}

function saveRecord_(inputRecord) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getRecordSheet_(ss);
  ensureRecordJsonColumn_(sheet);

  const currentRows = readRecordRows_(sheet);
  const now = nowIso_();
  const record = sanitizeRecord_(inputRecord, now);
  const matches = findSaveMatches_(currentRows, record);

  if (matches.length > 1) {
    return {
      ok: false,
      error: 'duplicate_records',
      duplicateCount: matches.length,
      dateKey: record.dateKey,
      slotKey: record.slotKey
    };
  }

  let mode = 'created';
  let targetRow = sheet.getLastRow() + 1;
  if (matches.length === 1) {
    mode = 'updated';
    targetRow = matches[0].rowNumber;
    record.savedAt = record.savedAt || matches[0].record.savedAt || now;
    if (!record.recordId && matches[0].record.recordId) {
      record.recordId = matches[0].record.recordId;
    }
  }

  if (!record.recordId) {
    record.recordId = createRecordId_(record);
  }
  if (!record.savedAt) record.savedAt = now;
  record.updatedAt = now;
  if (record.status === 'final' && !record.finalSavedAt) record.finalSavedAt = now;

  const rowValues = recordToRowValues_(record);
  sheet.getRange(targetRow, 1, 1, RECORD_HEADERS.length).setValues([rowValues]);

  return {
    ok: true,
    apiVersion: API_VERSION,
    storage: STORAGE_MODE,
    mode: mode,
    recordId: record.recordId,
    dateKey: record.dateKey,
    slotKey: record.slotKey,
    updatedAt: record.updatedAt
  };
}

function findSaveMatches_(rows, record) {
  if (record.recordId) {
    const idMatches = rows.filter(function(row) {
      return row.recordId === record.recordId;
    });
    if (idMatches.length) return idMatches;
  }

  return rows.filter(function(row) {
    return row.dateKey === record.dateKey && row.slotKey === record.slotKey;
  });
}

function recordToRowValues_(record) {
  return [
    record.dateKey,
    record.slotKey,
    record.slotLabel || '',
    record.dateLabel || '',
    record.dayLabel || '',
    record.savedAt || '',
    JSON.stringify(record.classes || []),
    JSON.stringify(record)
  ];
}

function sanitizeRecord_(inputRecord, now) {
  if (!inputRecord || typeof inputRecord !== 'object' || Array.isArray(inputRecord)) {
    throw new Error('invalid_record');
  }

  const record = clonePlainObject_(inputRecord);
  record.recordVersion = API_VERSION;
  record.dateKey = stringValue_(record.dateKey);
  record.slotKey = stringValue_(record.slotKey);
  record.dateLabel = stringValue_(record.dateLabel);
  record.dayLabel = stringValue_(record.dayLabel);
  record.slotLabel = stringValue_(record.slotLabel);
  record.status = stringValue_(record.status || 'draft');
  record.savedAt = stringValue_(record.savedAt);
  record.updatedAt = stringValue_(record.updatedAt);
  record.finalSavedAt = stringValue_(record.finalSavedAt);
  record.recordId = stringValue_(record.recordId);

  if (!record.dateKey) throw new Error('missing_dateKey');
  if (!record.slotKey) throw new Error('missing_slotKey');
  if (!VALID_STATUSES[record.status]) throw new Error('invalid_status');
  if (!Array.isArray(record.classes)) throw new Error('invalid_classes');

  record.classes = normalizeClasses_(record.classes);
  record.nativeMembers = normalizeParticipantArray_(record.nativeMembers, 'native');
  record.nonNativeMembers = normalizeParticipantArray_(record.nonNativeMembers, 'nonnative');
  record.groupingSnapshot = normalizeGroupingSnapshot_(record.groupingSnapshot);

  if (!record.savedAt) record.savedAt = now;
  return record;
}

function normalizeV2Record_(recordJson, legacy) {
  const record = clonePlainObject_(recordJson);
  record.recordVersion = Number(record.recordVersion) || API_VERSION;
  record.recordId = stringValue_(record.recordId);
  record.dateKey = stringValue_(record.dateKey || legacy.dateKey);
  record.slotKey = stringValue_(record.slotKey || legacy.slotKey);
  record.slotLabel = stringValue_(record.slotLabel || legacy.slotLabel);
  record.dateLabel = stringValue_(record.dateLabel || legacy.dateLabel);
  record.dayLabel = stringValue_(record.dayLabel || legacy.dayLabel);
  record.savedAt = stringValue_(record.savedAt || legacy.savedAt);
  record.updatedAt = stringValue_(record.updatedAt || record.savedAt || legacy.savedAt);
  record.finalSavedAt = stringValue_(record.finalSavedAt);
  record.status = VALID_STATUSES[record.status] ? record.status : 'draft';
  record.classes = normalizeClasses_(Array.isArray(record.classes) ? record.classes : legacy.classes);
  record.nativeMembers = normalizeParticipantArray_(record.nativeMembers, 'native');
  record.nonNativeMembers = normalizeParticipantArray_(record.nonNativeMembers, 'nonnative');
  record.groupingSnapshot = normalizeGroupingSnapshot_(record.groupingSnapshot);
  return record;
}

function normalizeLegacyRecord_(legacy, rowNumber) {
  return {
    recordVersion: 1,
    recordId: createLegacyRecordId_(legacy, rowNumber),
    dateKey: legacy.dateKey,
    slotKey: legacy.slotKey,
    slotLabel: legacy.slotLabel,
    dateLabel: legacy.dateLabel,
    dayLabel: legacy.dayLabel,
    status: 'draft',
    savedAt: legacy.savedAt,
    updatedAt: legacy.savedAt,
    classes: normalizeClasses_(legacy.classes)
  };
}

function normalizeClasses_(classes) {
  if (!Array.isArray(classes)) return [];
  return classes.map(function(item) {
    const entry = clonePlainObject_(item || {});
    entry.classId = stringValue_(entry.classId || entry.id || entry.className);
    entry.className = stringValue_(entry.className || entry.name || entry.classId);
    entry.holding = normalizeStringArray_(entry.holding);
    entry.korMembers = normalizeStringArray_(entry.korMembers);
    entry.korTeachers = normalizeStringArray_(entry.korTeachers);
    entry.attend = normalizeOptionalNumber_(entry.attend);
    entry.tutor = normalizeOptionalNumber_(entry.tutor);
    entry.memo = stringValue_(entry.memo);
    return entry;
  });
}

function normalizeParticipantArray_(value, defaultType) {
  if (!Array.isArray(value)) return [];
  return value.map(function(item) {
    if (typeof item === 'string') {
      const name = item.trim();
      if (!name) return null;
      return {
        name: name,
        type: defaultType,
        groupId: '',
        groupName: '',
        table: ''
      };
    }

    if (!item || typeof item !== 'object') return null;

    const name = String(item.name || '').trim();
    if (!name) return null;

    return {
      name: name,
      type: item.type === 'native' || item.type === 'nonnative' ? item.type : defaultType,
      groupId: String(item.groupId === null || item.groupId === undefined ? '' : item.groupId),
      groupName: String(item.groupName === null || item.groupName === undefined ? '' : item.groupName),
      table: String(item.table === null || item.table === undefined ? '' : item.table)
    };
  }).filter(function(member) {
    return !!member;
  });
}

function normalizeGroupingSnapshot_(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null;
  const next = clonePlainObject_(snapshot);
  next.totalPeople = normalizeOptionalNumber_(next.totalPeople);
  next.nativeCount = normalizeOptionalNumber_(next.nativeCount);
  next.nonNativeCount = normalizeOptionalNumber_(next.nonNativeCount);
  next.koreanCount = normalizeOptionalNumber_(next.koreanCount);
  next.teacherCount = normalizeOptionalNumber_(next.teacherCount);
  next.groups = Array.isArray(next.groups) ? next.groups.map(function(group) {
    const entry = clonePlainObject_(group || {});
    entry.groupId = stringValue_(entry.groupId);
    entry.groupName = stringValue_(entry.groupName);
    entry.table = stringValue_(entry.table);
    entry.nativeMembers = normalizeParticipantArray_(entry.nativeMembers, 'native');
    entry.nonNativeMembers = normalizeParticipantArray_(entry.nonNativeMembers, 'nonnative');
    entry.koreanMembers = normalizeStringArray_(entry.koreanMembers);
    entry.teachers = normalizeStringArray_(entry.teachers);
    return entry;
  }) : [];
  return next;
}

function deleteRecord_(recordId, dateKey, slotKey) {
  recordId = stringValue_(recordId);
  dateKey = stringValue_(dateKey);
  slotKey = stringValue_(slotKey);
  if (!recordId) {
    if (!dateKey) throw new Error('missing_dateKey');
    if (!slotKey) throw new Error('missing_slotKey');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getRecordSheet_(ss);
  const rows = readRecordRows_(sheet).filter(function(row) {
    if (recordId) return row.recordId === recordId;
    return row.dateKey === dateKey && row.slotKey === slotKey;
  });

  if (!rows.length) {
    return { ok: false, error: 'record_not_found', recordId: recordId, dateKey: dateKey, slotKey: slotKey };
  }
  if (rows.length > 1) {
    return {
      ok: false,
      error: 'duplicate_records',
      duplicateCount: rows.length,
      recordId: recordId,
      dateKey: dateKey,
      slotKey: slotKey
    };
  }

  const target = rows[0];
  sheet.deleteRow(target.rowNumber);

  return {
    ok: true,
    mode: 'deleted',
    recordId: target.recordId || recordId,
    dateKey: target.dateKey,
    slotKey: target.slotKey,
    deletedCount: 1
  };
}

function savePresets_(presets) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PRESET_SHEET);
  if (!sheet) sheet = ss.insertSheet(PRESET_SHEET);
  const savedAt = nowIso_();

  sheet.clearContents();
  sheet.getRange(1, 1, 1, 2).setValues([['savedAt', 'presets']]);
  sheet.getRange(2, 1, 1, 2).setValues([[savedAt, JSON.stringify(presets || [])]]);

  return { ok: true, savedAt: savedAt };
}

function loadPresets_(ss) {
  const sheet = ss.getSheetByName(PRESET_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return null;
  const raw = sheet.getRange(2, 2).getValue();
  if (!raw) return null;
  const parsed = safeJsonParse_(raw);
  return parsed || null;
}

function parseClasses_(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') {
    const parsed = safeJsonParse_(value);
    return Array.isArray(parsed) ? parsed : [];
  }
  return [];
}

function clonePlainObject_(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return JSON.parse(JSON.stringify(value));
}

function normalizeStringArray_(value) {
  if (!Array.isArray(value)) return [];
  return value.map(function(item) {
    return stringValue_(item);
  }).filter(function(item) {
    return item;
  });
}

function normalizeOptionalNumber_(value) {
  if (value === '' || value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function stringValue_(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function safeJsonParse_(value) {
  try {
    return JSON.parse(String(value));
  } catch(ignore) {
    return null;
  }
}

function nowIso_() {
  return new Date().toISOString();
}

function createRecordId_(record) {
  return [
    'rec',
    record.dateKey || 'date',
    record.slotKey || 'slot',
    Utilities.getUuid()
  ].join('_');
}

function createLegacyRecordId_(legacy, rowNumber) {
  return ['legacy', legacy.dateKey || 'date', legacy.slotKey || 'slot', rowNumber].join('_');
}
