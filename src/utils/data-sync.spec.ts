import { Database } from 'sqlite';
import {
  normalizeGameName,
  checkRecordExists,
  insertIfMissing,
} from '../utils/data-sync';

describe('normalizeGameName', () => {
  it('should convert to lowercase', () => {
    expect(normalizeGameName('Fischl')).toBe('fischl');
    expect(normalizeGameName('FISCHL')).toBe('fischl');
  });

  it('should remove spaces', () => {
    expect(normalizeGameName('Hu Tao')).toBe('hutao');
    expect(normalizeGameName('Ayaka')).toBe('ayaka');
  });

  it('should remove special characters', () => {
    expect(normalizeGameName("It's time")).toBe('itstime');
    expect(normalizeGameName('Foo-Bar')).toBe('foobar');
    expect(normalizeGameName('Test: Value')).toBe('testvalue');
    expect(normalizeGameName('A-B—C')).toBe('abc');
  });

  it('should handle complex names', () => {
    expect(normalizeGameName("Mika's Sword")).toBe('mikassword');
    expect(normalizeGameName('Hu Tao II')).toBe('hutaoii');
  });

  it('should match frontend normalization', () => {
    // Test cases that matter for matching frontend
    expect(normalizeGameName('Fischl')).toBe('fischl');
    expect(normalizeGameName('Hu Tao')).toBe('hutao');
    expect(normalizeGameName('Ayaka')).toBe('ayaka');
    expect(normalizeGameName('The Catch')).toBe('thecatch');
  });
});

describe('checkRecordExists', () => {
  let db: Database;

  beforeAll(async () => {
    // Setup: create in-memory test database
    const sqlite3 = require('sqlite3').verbose();
    const { open } = require('sqlite');

    db = await open({
      filename: ':memory:',
      driver: sqlite3.Database,
    });

    await db.exec(`
      CREATE TABLE test_table (
        id INTEGER PRIMARY KEY,
        normalized_name TEXT NOT NULL UNIQUE
      )
    `);
  });

  afterAll(async () => {
    await db.close();
  });

  it('should return false when record does not exist', async () => {
    const exists = await checkRecordExists(db, 'test_table', 'nonexistent');
    expect(exists).toBe(false);
  });

  it('should return true when record exists', async () => {
    await db.run(
      'INSERT INTO test_table (normalized_name) VALUES (?)',
      ['exists']
    );

    const exists = await checkRecordExists(db, 'test_table', 'exists');
    expect(exists).toBe(true);
  });
});

describe('insertIfMissing', () => {
  let db: Database;

  beforeAll(async () => {
    const sqlite3 = require('sqlite3').verbose();
    const { open } = require('sqlite');

    db = await open({
      filename: ':memory:',
      driver: sqlite3.Database,
    });

    await db.exec(`
      CREATE TABLE test_items (
        id INTEGER PRIMARY KEY,
        normalized_name TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL
      )
    `);
  });

  afterAll(async () => {
    await db.close();
  });

  it('should insert new records', async () => {
    const result = await insertIfMissing(
      db,
      'test_items',
      'newitem',
      ['normalized_name', 'name'],
      ['newitem', 'New Item']
    );

    expect(result.inserted).toBe(true);

    const record = await db.get(
      'SELECT * FROM test_items WHERE normalized_name = ?',
      ['newitem']
    );
    expect(record).toBeDefined();
    expect(record.name).toBe('New Item');
  });

  it('should skip existing records', async () => {
    const result = await insertIfMissing(
      db,
      'test_items',
      'newitem',
      ['normalized_name', 'name'],
      ['newitem', 'Updated Item']
    );

    expect(result.inserted).toBe(false);
    expect(result.reason).toBe('already_exists');

    // Verify that the existing record was not updated
    const record = await db.get(
      'SELECT * FROM test_items WHERE normalized_name = ?',
      ['newitem']
    );
    expect(record.name).toBe('New Item');
  });

  it('should preserve manually edited records', async () => {
    const result = await insertIfMissing(
      db,
      'test_items',
      'newitem',
      ['normalized_name', 'name'],
      ['newitem', 'Manually Edited Item']
    );

    expect(result.inserted).toBe(false);

    const record = await db.get(
      'SELECT * FROM test_items WHERE normalized_name = ?',
      ['newitem']
    );
    expect(record.name).toBe('New Item'); // Still original value
  });
});
