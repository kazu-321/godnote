const fs = require('node:fs');
const path = require('node:path');

function stateFilePath(userDataPath) {
  return path.join(userDataPath, 'workspace-state.json');
}

function loadState(userDataPath) {
  try {
    const raw = fs.readFileSync(stateFilePath(userDataPath), 'utf8');
    const parsed = JSON.parse(raw);
    return {
      last: parsed.last ?? null,
      list: Array.isArray(parsed.list) ? parsed.list : [],
    };
  } catch {
    return { last: null, list: [] };
  }
}

function saveState(userDataPath, state) {
  fs.mkdirSync(userDataPath, { recursive: true });
  fs.writeFileSync(stateFilePath(userDataPath), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function saveRecentWorkspace(userDataPath, record) {
  const nextRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
  };
  const state = loadState(userDataPath);
  const nextList = [nextRecord];
  for (const current of state.list) {
    if (current.path === nextRecord.path) continue;
    nextList.push(current);
  }
  const nextState = { last: nextRecord, list: nextList };
  saveState(userDataPath, nextState);
  return nextRecord;
}

function getLastWorkspace(userDataPath) {
  return loadState(userDataPath).last;
}

function getRecentWorkspaces(userDataPath) {
  return loadState(userDataPath).list;
}

module.exports = {
  getLastWorkspace,
  getRecentWorkspaces,
  saveRecentWorkspace,
};
