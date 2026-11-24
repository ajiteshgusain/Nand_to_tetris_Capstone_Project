#!/usr/bin/env python3
"""
assembler.py - Hack Assembler (two-pass), written in Python

Author : Ajitesh Singh Gusain
Roll No: 2501630014        K = 14
Extra feature (K mod 3 = 2): print a WARNING if the same label is defined twice.

Usage:  python assembler.py Prog.asm        ->  creates Prog.hack
"""

import sys
import os

# ---------------------------------------------------------------- tables
COMP = {
    # a = 0
    "0": "0101010", "1": "0111111", "-1": "0111010",
    "D": "0001100", "A": "0110000", "!D": "0001101", "!A": "0110001",
    "-D": "0001111", "-A": "0110011", "D+1": "0011111", "A+1": "0110111",
    "D-1": "0001110", "A-1": "0110010", "D+A": "0000010", "D-A": "0010011",
    "A-D": "0000111", "D&A": "0000000", "D|A": "0010101",
    # a = 1
    "M": "1110000", "!M": "1110001", "-M": "1110011", "M+1": "1110111",
    "M-1": "1110010", "D+M": "1000010", "D-M": "1010011", "M-D": "1000111",
    "D&M": "1000000", "D|M": "1010101",
}

DEST = {
    "": "000", "M": "001", "D": "010", "MD": "011",
    "A": "100", "AM": "101", "AD": "110", "AMD": "111",
}

JUMP = {
    "": "000", "JGT": "001", "JEQ": "010", "JGE": "011",
    "JLT": "100", "JNE": "101", "JLE": "110", "JMP": "111",
}


def predefined_symbols():
    """Symbol table with the predefined Hack symbols."""
    table = {
        "SP": 0, "LCL": 1, "ARG": 2, "THIS": 3, "THAT": 4,
        "SCREEN": 16384, "KBD": 24576,
    }
    for i in range(16):
        table["R" + str(i)] = i
    return table


class AsmError(Exception):
    """Assembly error that remembers the source line number."""

    def __init__(self, line_no, message):
        super().__init__("Line %d: %s" % (line_no, message))


# ---------------------------------------------------------------- helpers
def clean(line):
    """Remove comments and all whitespace from one line."""
    if "//" in line:
        line = line[:line.index("//")]
    return "".join(line.split())


def read_program(path):
    """Return a list of (source_line_number, cleaned_text); blanks removed."""
    program = []
    with open(path, "r") as f:
        for number, raw in enumerate(f, start=1):
            text = clean(raw)
            if text:
                program.append((number, text))
    return program


# ---------------------------------------------------------------- pass 1
def first_pass(program, symbols):
    """
    Find labels like (LOOP) and record the address of the NEXT real
    instruction. Labels are not instructions, so they do not use an address.
    Duplicate labels trigger a warning (extra feature for K mod 3 = 2).
    Returns the list of real instructions (labels removed).
    """
    instructions = []
    label_lines = {}          # label -> source line of its first definition
    rom_address = 0
    for line_no, text in program:
        if text.startswith("("):
            if not text.endswith(")") or len(text) < 3:
                raise AsmError(line_no, "invalid label '%s'" % text)
            label = text[1:-1]
            if label in label_lines:
                print("Warning: Line %d: label '%s' is defined more than once "
                      "(first defined on line %d). Keeping the first definition."
                      % (line_no, label, label_lines[label]))
                continue
            label_lines[label] = line_no
            symbols[label] = rom_address
        else:
            instructions.append((line_no, text))
            rom_address += 1
    return instructions


# ---------------------------------------------------------------- pass 2
def translate_a(line_no, text, symbols, next_var):
    """Translate @xxx. Returns (binary, updated_next_var)."""
    value = text[1:]
    if value == "":
        raise AsmError(line_no, "empty A-instruction")
    if value.isdigit():
        number = int(value)
    else:
        if value[0].isdigit():
            raise AsmError(line_no, "invalid symbol '%s'" % value)
        if value not in symbols:             # new variable -> RAM 16, 17, ...
            symbols[value] = next_var[0]
            next_var[0] += 1
        number = symbols[value]
    if number > 32767:
        raise AsmError(line_no, "address %d out of range" % number)
    return "0" + format(number, "015b")


def translate_c(line_no, text):
    """Translate dest=comp;jump."""
    dest, jump = "", ""
    comp = text
    if "=" in comp:
        dest, comp = comp.split("=", 1)
    if ";" in comp:
        comp, jump = comp.split(";", 1)
    if dest not in DEST or comp not in COMP or jump not in JUMP:
        raise AsmError(line_no, "invalid instruction '%s'" % text)
    return "111" + COMP[comp] + DEST[dest] + JUMP[jump]


def second_pass(instructions, symbols):
    output = []
    next_var = [16]
    for line_no, text in instructions:
        if text.startswith("@"):
            output.append(translate_a(line_no, text, symbols, next_var))
        else:
            output.append(translate_c(line_no, text))
    return output


# ---------------------------------------------------------------- main
def assemble(path):
    symbols = predefined_symbols()
    program = read_program(path)
    instructions = first_pass(program, symbols)
    return second_pass(instructions, symbols)


def main():
    if len(sys.argv) != 2 or not sys.argv[1].endswith(".asm"):
        print("Usage: python assembler.py <file.asm>")
        sys.exit(1)
    src = sys.argv[1]
    try:
        binary = assemble(src)
    except AsmError as e:
        print("Error:", e)
        sys.exit(1)
    out = os.path.splitext(src)[0] + ".hack"
    with open(out, "w") as f:
        f.write("\n".join(binary) + "\n")
    print("Assembled %d instructions -> %s" % (len(binary), out))


if __name__ == "__main__":
    main()
