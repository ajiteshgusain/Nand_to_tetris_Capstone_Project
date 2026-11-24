// Demo: label LOOP is defined twice
@1
D=A
(LOOP)
D=D+1
@LOOP
D;JLT
(LOOP)
@LOOP
0;JMP
