// Box.asm
// Ajitesh Singh Gusain | Roll No. 2501630014 | K = 14
//
// Draws a black box while ANY key is held, erases it when released.
//   Start row  = K = 14                      -> first word = SCREEN + 32*14 = 16384 + 448 = 16832
//   Height     = 20 rows                     -> rows 14 .. 33
//   Width      = 16 * ((14 mod 4) + 1) = 48  -> 3 words per row, from the left edge
//   After each row, move to the next row by adding 32 - 3 = 29 to the address.

(MAIN)
    @KBD
    D=M
    @KEYDOWN
    D;JNE           // some key is pressed
    @colour
    M=0             // no key: paint white (erase)
    @PAINT
    0;JMP
(KEYDOWN)
    @colour
    M=-1            // key pressed: paint black

(PAINT)
    @SCREEN
    D=A
    @448            // 32 * K = 32 * 14
    D=D+A
    @addr
    M=D             // addr = first word of the box
    @20
    D=A
    @rows
    M=D             // rows = 20

(ROWLOOP)
    @3
    D=A
    @cols
    M=D             // cols = 3 words per row (48 pixels)

(COLLOOP)
    @colour
    D=M
    @addr
    A=M
    M=D             // RAM[addr] = colour
    @addr
    M=M+1           // next word in the same row
    @cols
    M=M-1
    D=M
    @COLLOOP
    D;JGT           // repeat until the 3 words are done

    @29             // 32 - 3
    D=A
    @addr
    M=D+M           // jump to the start of the next row
    @rows
    M=M-1
    D=M
    @ROWLOOP
    D;JGT           // repeat for 20 rows

    @MAIN
    0;JMP           // check the keyboard again, forever
