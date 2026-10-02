const MAX_BYTES = 5242880;

const KINDS = {
  cv: {
    label: 'CV',
    types: {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
  },
  id: {
    label: 'ID document',
    types: {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png'
    }
  }
};

const SIGNATURES = {
  pdf: [0x25, 0x50, 0x44, 0x46],
  doc: [0xd0, 0xcf, 0x11, 0xe0],
  docx: [0x50, 0x4b, 0x03, 0x04],
  jpg: [0xff, 0xd8, 0xff],
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
};

function extensionOf(name) {
  const match = /\.([A-Za-z0-9]+)$/.exec(String(name || ''));
  return match ? match[1].toLowerCase() : '';
}

function safeBase(name) {
  const base = String(name || '')
    .replace(/\.[^.]*$/, '')
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60);
  return base || 'file';
}

function checkDeclaredFile(kind, file) {
  const rule = KINDS[kind];
  if (!file || typeof file !== 'object') {
    return { ok: false, message: 'Please upload your ' + rule.label + '.' };
  }
  const ext = extensionOf(file.name);
  const contentType = rule.types[ext];
  if (!contentType) {
    return {
      ok: false,
      message: 'Your ' + rule.label + ' must be one of: ' + Object.keys(rule.types).join(', ').toUpperCase() + '.'
    };
  }
  const size = Number(file.size);
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, message: 'Your ' + rule.label + ' appears to be empty.' };
  }
  if (size > MAX_BYTES) {
    return { ok: false, message: 'Your ' + rule.label + ' is too large. Maximum size is 5MB.' };
  }
  return { ok: true, ext, contentType, base: safeBase(file.name) };
}

function matchesSignature(ext, buffer) {
  const signature = SIGNATURES[ext];
  if (!signature || !buffer || buffer.length < signature.length) return false;
  return signature.every((byte, i) => buffer[i] === byte);
}

module.exports = { MAX_BYTES, KINDS, extensionOf, checkDeclaredFile, matchesSignature };
