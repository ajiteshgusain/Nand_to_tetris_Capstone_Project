# Capstone: Make the Computer Draw a Box
Ajitesh Singh Gusain | Roll No. 2501630014 | K = 14 (K mod 3 = 2, K mod 4 = 2)

- `hdl/` CPU.hdl, Memory.hdl, Computer.hdl
- `assembler.py` two-pass Hack assembler (extra feature: duplicate-label warning)
- `Box.asm`, `Box.hack` box at row 14, 48 px wide (3 words), 20 rows
- `tests/` Add.asm, Max.asm, Rect.asm, DupLabel.asm, compare.py, sim.py
- `evidence/` duplicate-label warning output, Box simulation check

Run: `python assembler.py Box.asm`  ->  Box.hack
Compare with the official assembler: `python tests/compare.py mine.hack official.hack`
Pong.asm: copy it from the nand2tetris project 6 folder into tests/ and assemble it the same way.
