const COMP_TABLE = {
  '0': '0101010', '1': '0111111', '-1': '0111010',
  'D': '0001100', 'A': '0110000', 'M': '1110000',
  '!D': '0001101', '!A': '0110001', '!M': '1110001',
  '-D': '0001111', '-A': '0110011', '-M': '1110011',
  'D+1': '0011111', 'A+1': '0110111', 'M+1': '1110111',
  'D-1': '0001110', 'A-1': '0110010', 'M-1': '1110010',
  'D+A': '0000010', 'A+D': '0000010', 'D+M': '1000010', 'M+D': '1000010',
  'D-A': '0010011', 'D-M': '1010011', 'A-D': '0000111', 'M-D': '1000111',
  'D&A': '0000000', 'A&D': '0000000', 'D&M': '1000000', 'M&D': '1000000',
  'D|A': '0010101', 'A|D': '0010101', 'D|M': '1010101', 'M|D': '1010101',
};

const DEST_TABLE = {
  '': '000', 'M': '001', 'D': '010', 'MD': '011', 'DM': '011',
  'A': '100', 'AM': '101', 'MA': '101', 'AD': '110', 'DA': '110',
  'AMD': '111', 'ADM': '111',
};

const JUMP_TABLE = {
  '': '000', 'JGT': '001', 'JEQ': '010', 'JGE': '011',
  'JLT': '100', 'JNE': '101', 'JLE': '110', 'JMP': '111',
};

export function assembleHack(sourceText) {
  const symbols = {
    SP: 0, LCL: 1, ARG: 2, THIS: 3, THAT: 4,
    SCREEN: 16384, KBD: 24576,
  };
  for (let i = 0; i < 16; i++) {
    symbols[`R${i}`] = i;
  }

  const cleaned = sourceText
    .split('\n')
    .map((line) => line.split('//')[0].trim())
    .filter(Boolean);

  const labels = {};
  const variables = {};
  const instructions = [];
  let romAddress = 0;

  for (const line of cleaned) {
    if (line.startsWith('(') && line.endsWith(')')) {
      const label = line.slice(1, -1).trim();
      symbols[label] = romAddress;
      labels[label] = romAddress;
    } else {
      instructions.push(line);
      romAddress += 1;
    }
  }

  let nextRam = 16;
  const binaryLines = [];
  const annotatedLines = [];

  for (const line of instructions) {
    if (line.startsWith('@')) {
      const sym = line.slice(1).trim();
      let addr;
      if (/^\d+$/.test(sym)) {
        addr = parseInt(sym, 10);
      } else {
        if (!(sym in symbols)) {
          symbols[sym] = nextRam;
          variables[sym] = nextRam;
          nextRam += 1;
        }
        addr = symbols[sym];
      }
      const bin = '0' + addr.toString(2).padStart(15, '0');
      binaryLines.push(bin);
      annotatedLines.push({ bin, type: 'A-inst', src: line });
    } else {
      let dest = '';
      let jump = '';
      let compPart = line;
      if (compPart.includes('=')) {
        [dest, compPart] = compPart.split('=', 2);
      }
      if (compPart.includes(';')) {
        [compPart, jump] = compPart.split(';', 2);
      }
      const cBits = COMP_TABLE[compPart.trim()] || '0101010';
      const dBits = DEST_TABLE[dest.trim()] || '000';
      const jBits = JUMP_TABLE[jump.trim()] || '000';
      const bin = `111${cBits}${dBits}${jBits}`;
      binaryLines.push(bin);
      annotatedLines.push({ bin, type: 'C-inst', src: line });
    }
  }

  const symbolsTxt = [
    'LABELS',
    ...Object.entries(labels).map(([k, v]) => `${k} = ${v}`),
    '',
    'VARIABLES',
    ...Object.entries(variables).map(([k, v]) => `${k} = ${v}`),
  ].join('\n');

  return {
    binaryLines,
    annotatedLines,
    hackText: binaryLines.join('\n'),
    symbolsTxt,
    labelsCount: Object.keys(labels).length,
    variablesCount: Object.keys(variables).length,
  };
}

export class HackSimulator {
  constructor(binaryLines) {
    this.rom = binaryLines.slice();
    this.ram = new Int16Array(24577);
    this.A = 0;
    this.D = 0;
    this.PC = 0;
    this.cycles = 0;
  }

  reset() {
    this.ram.fill(0);
    this.A = 0;
    this.D = 0;
    this.PC = 0;
    this.cycles = 0;
  }

  setKey(keyCode) {
    this.ram[24576] = keyCode;
  }

  step() {
    if (this.PC < 0 || this.PC >= this.rom.length) return;
    const inst = this.rom[this.PC];
    this.cycles += 1;

    if (inst[0] === '0') {
      this.A = parseInt(inst.slice(1), 2);
      this.PC += 1;
      return;
    }

    const aBit = inst[3];
    const cBits = inst.slice(4, 10);
    const dBits = inst.slice(10, 13);
    const jBits = inst.slice(13, 16);

    const x = this.D;
    const y = aBit === '1' ? (this.ram[this.A] || 0) : this.A;

    let out = 0;
    switch (cBits) {
      case '101010': out = 0; break;
      case '111111': out = 1; break;
      case '111010': out = -1; break;
      case '001100': out = x; break;
      case '110000': out = y; break;
      case '001101': out = ~x; break;
      case '110001': out = ~y; break;
      case '001111': out = -x; break;
      case '110011': out = -y; break;
      case '011111': out = x + 1; break;
      case '110111': out = y + 1; break;
      case '001110': out = x - 1; break;
      case '110010': out = y - 1; break;
      case '000010': out = x + y; break;
      case '010011': out = x - y; break;
      case '000111': out = y - x; break;
      case '000000': out = x & y; break;
      case '010101': out = x | y; break;
      default: out = 0;
    }

    out = (out << 16) >> 16;

    if (dBits[2] === '1' && this.A >= 0 && this.A < this.ram.length) {
      this.ram[this.A] = out;
    }
    if (dBits[1] === '1') {
      this.D = out;
    }
    if (dBits[0] === '1') {
      this.A = out;
    }

    const zr = out === 0;
    const ng = out < 0;
    const pos = !zr && !ng;

    const jump =
      (jBits[0] === '1' && ng) ||
      (jBits[1] === '1' && zr) ||
      (jBits[2] === '1' && pos);

    this.PC = jump ? this.A : this.PC + 1;
  }
}