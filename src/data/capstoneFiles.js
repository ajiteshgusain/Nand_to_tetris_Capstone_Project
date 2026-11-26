export const STUDENT_INFO = {
  name: 'Aditya R Menon',
  rollNo: '2501630006',
  course: 'ETCCNT301 • Nand to Tetris - I',
  school: 'School of Engineering & Technology',
  university: 'K.R. Mangalam University',
  k: 6,
};

export const HDL_FILES = {
  'CPU.hdl': `CHIP CPU {
    IN  inM[16],
        instruction[16],
        reset;

    OUT outM[16],
        writeM,
        addressM[15],
        pc[15];

    PARTS:
    Not(in=instruction[15], out=isA);
    And(a=instruction[15], b=instruction[5], out=cLoadA);
    Or(a=isA, b=cLoadA, out=loadA);
    Mux16(a=instruction, b=aluOut, sel=instruction[15], out=aIn);
    ARegister(in=aIn, load=loadA, out=aOut, out[0..14]=addressM);

    And(a=instruction[15], b=instruction[12], out=selM);
    Mux16(a=aOut, b=inM, sel=selM, out=aluY);

    And(a=instruction[15], b=instruction[4], out=loadD);
    DRegister(in=aluOut, load=loadD, out=dOut);

    ALU(x=dOut, y=aluY, zx=instruction[11], nx=instruction[10], zy=instruction[9], ny=instruction[8], f=instruction[7], no=instruction[6], out=aluOut, out=outM, zr=zr, ng=ng);

    And(a=instruction[15], b=instruction[3], out=writeM);

    Not(in=zr, out=notZr);
    Not(in=ng, out=notNg);
    And(a=notZr, b=notNg, out=pos);

    And(a=instruction[2], b=ng, out=jlt);
    And(a=instruction[1], b=zr, out=jeq);
    And(a=instruction[0], b=pos, out=jgt);

    Or(a=jlt, b=jeq, out=jle);
    Or(a=jle, b=jgt, out=jmpCond);
    And(a=instruction[15], b=jmpCond, out=pcLoad);

    PC(in=aOut, load=pcLoad, inc=true, reset=reset, out[0..14]=pc);
}`,
  'Memory.hdl': `CHIP Memory {
    IN in[16], load, address[15];
    OUT out[16];

    PARTS:
    DMux4Way(in=load, sel=address[13..14], a=loadRam1, b=loadRam2, c=loadScreen, d=loadKbd);
    Or(a=loadRam1, b=loadRam2, out=loadRam);
    RAM16K(in=in, load=loadRam, address=address[0..13], out=outRam);
    Screen(in=in, load=loadScreen, address=address[0..12], out=outScreen);
    Keyboard(out=outKbd);
    Mux4Way16(a=outRam, b=outRam, c=outScreen, d=outKbd, sel=address[13..14], out=out);
}`,
  'Computer.hdl': `CHIP Computer {
    IN reset;

    PARTS:
    ROM32K(address=pc, out=instruction);
    CPU(inM=memOut, instruction=instruction, reset=reset, outM=outM, writeM=writeM, addressM=addressM, pc=pc);
    Memory(in=outM, load=writeM, address=addressM, out=memOut);
}`,
  'ALU.hdl': `CHIP ALU {
    IN  x[16], y[16], zx, nx, zy, ny, f, no;
    OUT out[16], zr, ng;

    PARTS:
    Mux16(a=x, b=false, sel=zx, out=x1);
    Not16(in=x1, out=notX1);
    Mux16(a=x1, b=notX1, sel=nx, out=x2);

    Mux16(a=y, b=false, sel=zy, out=y1);
    Not16(in=y1, out=notY1);
    Mux16(a=y1, b=notY1, sel=ny, out=y2);

    Add16(a=x2, b=y2, out=addXY);
    And16(a=x2, b=y2, out=andXY);
    Mux16(a=andXY, b=addXY, sel=f, out=fOut);

    Not16(in=fOut, out=notFOut);
    Mux16(a=fOut, b=notFOut, sel=no, out=out, out[0..7]=low8, out[8..15]=high8, out[15]=ng);

    Or8Way(in=low8, out=orLow);
    Or8Way(in=high8, out=orHigh);
    Or(a=orLow, b=orHigh, out=notZr);
    Not(in=notZr, out=zr);
}`,
};

export const PYTHON_ASSEMBLER = `import os
import sys

COMP_TABLE = {
    "0": "0101010", "1": "0111111", "-1": "0111010",
    "D": "0001100", "A": "0110000", "M": "1110000",
    "!D": "0001101", "!A": "0110001", "!M": "1110001",
    "-D": "0001111", "-A": "0110011", "-M": "1110011",
    "D+1": "0011111", "A+1": "0110111", "M+1": "1110111",
    "D-1": "0001110", "A-1": "0110010", "M-1": "1110010",
    "D+A": "0000010", "A+D": "0000010", "D+M": "1000010", "M+D": "1000010",
    "D-A": "0010011", "D-M": "1010011", "A-D": "0000111", "M-D": "1000111",
    "D&A": "0000000", "A&D": "0000000", "D&M": "1000000", "M&D": "1000000",
    "D|A": "0010101", "A|D": "0010101", "D|M": "1010101", "M|D": "1010101",
}

DEST_TABLE = {
    "": "000", "M": "001", "D": "010", "MD": "011", "DM": "011",
    "A": "100", "AM": "101", "MA": "101", "AD": "110", "DA": "110",
    "AMD": "111", "ADM": "111",
}

JUMP_TABLE = {
    "": "000", "JGT": "001", "JEQ": "010", "JGE": "011",
    "JLT": "100", "JNE": "101", "JLE": "110", "JMP": "111",
}

def build_predefined_symbols():
    symbols = {
        "SP": 0, "LCL": 1, "ARG": 2, "THIS": 3, "THAT": 4,
        "SCREEN": 16384, "KBD": 24576,
    }
    for i in range(16):
        symbols[f"R{i}"] = i
    return symbols

def clean_lines(raw_lines):
    cleaned = []
    for line in raw_lines:
        stripped = line.split("//")[0].strip()
        if stripped:
            cleaned.append(stripped)
    return cleaned

def assemble(asm_path):
    with open(asm_path, "r", encoding="utf-8") as f:
        lines = clean_lines(f.readlines())

    symbols = build_predefined_symbols()
    labels = {}
    variables = {}
    instructions = []

    rom_address = 0
    for line in lines:
        if line.startswith("(") and line.endswith(")"):
            label = line[1:-1].strip()
            symbols[label] = rom_address
            labels[label] = rom_address
        else:
            instructions.append(line)
            rom_address += 1

    next_ram = 16
    machine_code = []

    for line in instructions:
        if line.startswith("@"):
            symbol = line[1:].strip()
            if symbol.isdigit():
                address = int(symbol)
            else:
                if symbol not in symbols:
                    symbols[symbol] = next_ram
                    variables[symbol] = next_ram
                    next_ram += 1
                address = symbols[symbol]
            machine_code.append(f"0{address:015b}")
        else:
            dest, jump, comp_part = "", "", line
            if "=" in comp_part:
                dest, comp_part = comp_part.split("=", 1)
            if ";" in comp_part:
                comp_part, jump = comp_part.split(";", 1)
            machine_code.append(
                f"111{COMP_TABLE[comp_part.strip()]}{DEST_TABLE[dest.strip()]}{JUMP_TABLE[jump.strip()]}"
            )

    base_dir = os.path.dirname(os.path.abspath(asm_path))
    base_name = os.path.splitext(os.path.basename(asm_path))[0]
    with open(os.path.join(base_dir, f"{base_name}.hack"), "w", encoding="utf-8") as f:
        f.write("\\n".join(machine_code) + ("\\n" if machine_code else ""))

    with open(os.path.join(base_dir, "symbols.txt"), "w", encoding="utf-8") as f:
        f.write("LABELS\\n")
        for name, addr in labels.items():
            f.write(f"{name} = {addr}\\n")
        f.write("\\nVARIABLES\\n")
        for name, addr in variables.items():
            f.write(f"{name} = {addr}\\n")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(1)
    assemble(sys.argv[1])
`;

export const ASM_PRESETS = {
  'Box.asm (Capstone)': `(LOOP)
@24576
D=M
@WHITE
D;JEQ
@color
M=-1
@DRAW
0;JMP

(WHITE)
@color
M=0

(DRAW)
@16576
D=A
@addr
M=D
@20
D=A
@rows
M=D

(ROWLOOP)
@rows
D=M
@LOOP
D;JEQ

@color
D=M
@addr
A=M
M=D

@color
D=M
@addr
A=M+1
M=D

@color
D=M
@addr
A=M+1
A=A+1
M=D

@32
D=A
@addr
M=D+M

@rows
M=M-1
@ROWLOOP
0;JMP`,
  'Add.asm': `@2
D=A
@3
D=D+A
@0
M=D`,
  'Max.asm': `@R0
D=M
@R1
D=D-M
@OUTPUT_FIRST
D;JGT
@R1
D=M
@OUTPUT_D
0;JMP
(OUTPUT_FIRST)
@R0
D=M
(OUTPUT_D)
@R2
M=D
(INFINITE_LOOP)
@INFINITE_LOOP
0;JMP`,
  'Rect.asm': `@0
D=M
@INFINITE_LOOP
D;JLE
@counter
M=D
@SCREEN
D=A
@address
M=D
(LOOP)
@address
A=M
M=-1
@address
D=M
@32
D=D+A
@address
M=D
@counter
MD=M-1
@LOOP
D;JGT
(INFINITE_LOOP)
@INFINITE_LOOP
0;JMP`,
};

export const BOX_TEST_TST = `load Box.hack,
output-file BoxTest.out,
compare-to BoxTest.cmp,
output-list RAM[24576]%D1.6.1 RAM[16575]%D1.6.1 RAM[16576]%D1.6.1 RAM[16577]%D1.6.1 RAM[16578]%D1.6.1 RAM[16579]%D1.6.1 RAM[17186]%D1.6.1 RAM[17187]%D1.6.1;

set RAM[24576] 0,
repeat 1200 {
    ticktock;
}
output;

set RAM[24576] 65,
repeat 1200 {
    ticktock;
}
output;

set RAM[24576] 0,
repeat 1200 {
    ticktock;
}
output;`;

export const BOX_TEST_CMP = `|RAM[24576]|RAM[16575]|RAM[16576]|RAM[16577]|RAM[16578]|RAM[16579]|RAM[17186]|RAM[17187]|
|      0   |      0   |      0   |      0   |      0   |      0   |      0   |      0   |
|     65   |      0   |     -1   |     -1   |     -1   |      0   |     -1   |      0   |
|      0   |      0   |      0   |      0   |      0   |      0   |      0   |      0   |`;

export const PROJECT_REPORT_MD = `# Nand to Tetris - I (ETCCNT301) Capstone Project Report
## Make the Computer Draw a Box

- **Student Name:** Aditya R Menon
- **University Roll Number:** 2501630006
- **Course:** Nand to Tetris - I (ETCCNT301)
- **School & University:** School of Engineering & Technology, K.R. Mangalam University
- **Personal Number (K):** 6 (last two digits of 2501630006)

---

## 1. Personal Parameter Calculations (K = 6)

- **Personal Number (K):** \`6\`
- **Part B Extra Feature (K mod 3):** \`6 mod 3 = 0\` -> Export all discovered labels and RAM variables with their decimal addresses to \`symbols.txt\`.
- **Part C Box Position & Dimensions:**
  - **Starting Row:** Row \`6\` (\`SCREEN + 32 * 6 = 16384 + 192 = 16576\`)
  - **Height:** \`20\` screen rows (Rows \`6\` through \`25\`)
  - **Width:** \`16 * ((6 mod 4) + 1) = 16 * 3 = 48 pixels\` (\`3\` consecutive 16-bit words per row from the left edge)
  - **Screen Address Range:** Word \`16576\` (Row 6, Word 0) to Word \`17186\` (Row 25, Word 2)

---

## 2. Part A: Hack Computer Architecture (HDL)

The Hack hardware platform integrates \`Memory.hdl\`, \`CPU.hdl\`, and \`Computer.hdl\`:
- **Memory.hdl:** Uses \`DMux4Way\` and \`Mux4Way16\` on \`address[13..14]\` to route memory operations across \`RAM16K\` (\`0x0000-0x3FFF\`), \`Screen\` (\`0x4000-0x5FFF\`), and \`Keyboard\` (\`0x6000\`).
- **CPU.hdl:** Decodes A-instructions (\`instruction[15] == 0\`) and C-instructions (\`instruction[15] == 1\`), controls \`ARegister\`, \`DRegister\`, and \`ALU\`, and evaluates \`zr\` and \`ng\` status flags to drive \`PC\` jumps.
- **Computer.hdl:** Connects \`ROM32K\`, \`CPU\`, and \`Memory\` into a complete stored-program computer.
- **Built-in Chip Disclosure:** Built-in simulator implementations were used for foundational Project 1-3 sub-chips (\`ALU\`, \`PC\`, \`RAM16K\`, \`Mux16\`, \`DMux4Way\`, \`Mux4Way16\`, and elementary gates). All 5 official verification scripts (\`Memory.tst\`, \`CPU.tst\`, \`ComputerAdd.tst\`, \`ComputerMax.tst\`, \`ComputerRect.tst\`) passed with zero comparison errors.

---

## 3. Part B: Two-Pass Python Assembler (\`assembler.py\`)

1. **Pass 1 (Label Resolution):** Strips inline \`//\` comments and blank lines, tracks the ROM instruction counter, and maps \`(LABEL)\` declarations to their exact ROM addresses.
2. **Pass 2 (Binary Code & Variable Allocation):** Translates A-instructions (\`0\` + 15-bit address) and C-instructions (\`111\` + 7 comp bits + 3 dest bits + 3 jump bits). Unseen symbolic variables are allocated sequentially starting at RAM address \`16\`.
3. **K mod 3 = 0 Feature (\`symbols.txt\`):** Writes all resolved \`LABELS\` and \`VARIABLES\` with their assigned addresses to \`symbols.txt\`.

---

## 4. Part C: Interactive Box Program (\`Box.asm\`)

\`Box.asm\` polls \`RAM[24576]\` (\`KBD\`) in an infinite loop:
- If \`RAM[24576] != 0\`, \`color\` is set to \`-1\` (\`0xFFFF\`, black).
- If \`RAM[24576] == 0\`, \`color\` is set to \`0\` (\`0x0000\`, white).
- \`ROWLOOP\` iterates \`20\` times starting at \`16576\`, writing \`color\` into \`addr\`, \`addr + 1\`, and \`addr + 2\` (\`48\` pixels) before advancing \`addr\` by \`32\` words to the next row.

---

## 5. Bug Fixed During Development

During initial development of \`Box.asm\`, advancing the screen pointer across rows originally added \`3\` instead of \`32\` after writing the three horizontal words, which drew a diagonal staircase pattern instead of a vertical rectangle. Remembering that each Hack screen row is \`512\` pixels wide (\`32\` words of \`16\` bits each), updating the stride increment to \`@32\` (\`M=D+M\`) aligned every row cleanly along the left edge.
`;

export const README_MD = `# Nand to Tetris Capstone — Aditya R Menon (2501630006)

- **Personal Number (K):** 6
- **Box Geometry:** 48 × 20 pixels (3 words/row) starting at Row 6 (RAM 16576..17186)
- **Assembler Extra Feature (K mod 3 = 0):** Exports all labels and variables to \`symbols.txt\`

## Run Assembler
\`\`\`bash
python assembler.py Box.asm
\`\`\`
`;