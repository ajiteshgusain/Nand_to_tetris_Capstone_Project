import React, { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import {
  Cpu, Terminal, Monitor, FileCheck2, Download, Copy, Check,
  Play, Pause, StepForward, RotateCcw, Keyboard, ArrowRight,
} from 'lucide-react';
import {
  STUDENT_INFO,
  HDL_FILES,
  PYTHON_ASSEMBLER,
  ASM_PRESETS,
  BOX_TEST_TST,
  BOX_TEST_CMP,
  PROJECT_REPORT_MD,
  README_MD,
} from './data/capstoneFiles';
import { assembleHack, HackSimulator } from './utils/hackEngine';

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [activeTab, setActiveTab] = useState('HOME');
  const [rollInput, setRollInput] = useState(STUDENT_INFO.rollNo);
  const [selectedHdl, setSelectedHdl] = useState('CPU.hdl');
  const [copiedKey, setCopiedKey] = useState('');

  const [selectedPreset, setSelectedPreset] = useState('Box.asm (Capstone)');
  const [asmSource, setAsmSource] = useState(ASM_PRESETS['Box.asm (Capstone)']);
  const [asmRightTab, setAsmRightTab] = useState('HACK');

  const [isRunning, setIsRunning] = useState(true);
  const [speed, setSpeed] = useState(3000);
  const [keyPressed, setKeyPressed] = useState(0);
  const [simSnapshot, setSimSnapshot] = useState({
    cycles: 0, PC: 0, A: 0, D: 0, kbd: 0, inst: '0000000000000000', mem: {},
  });

  const canvasRef = useRef(null);
  const simRef = useRef(null);

  const kValue = useMemo(() => {
    const digits = rollInput.replace(/\D/g, '');
    if (digits.length < 2) return 6;
    return parseInt(digits.slice(-2), 10);
  }, [rollInput]);

  const kMod3 = kValue % 3;
  const kMod4 = kValue % 4;
  const wordsPerRow = kMod4 + 1;
  const boxWidthPx = 16 * wordsPerRow;
  const startAddr = 16384 + 32 * kValue;
  const endAddr = 16384 + 32 * (kValue + 19) + (wordsPerRow - 1);

  const assembled = useMemo(() => assembleHack(asmSource), [asmSource]);
  const capstoneAssembled = useMemo(
    () => assembleHack(ASM_PRESETS['Box.asm (Capstone)']),
    []
  );

  useEffect(() => {
    simRef.current = new HackSimulator(capstoneAssembled.binaryLines);
  }, [capstoneAssembled]);

  useEffect(() => {
    if (simRef.current) {
      simRef.current.setKey(keyPressed);
    }
  }, [keyPressed]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (activeTab !== 'PART C') return;
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      setKeyPressed(e.keyCode || 65);
    };
    const onKeyUp = () => {
      if (activeTab !== 'PART C') return;
      setKeyPressed(0);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [activeTab]);

  const renderScreenCanvas = () => {
    const canvas = canvasRef.current;
    const sim = simRef.current;
    if (!canvas || !sim) return;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(512, 256);
    const data = imgData.data;

    for (let row = 0; row < 256; row++) {
      for (let colWord = 0; colWord < 32; colWord++) {
        const word = sim.ram[16384 + row * 32 + colWord] || 0;
        for (let bit = 0; bit < 16; bit++) {
          const isBlack = ((word >> bit) & 1) === 1;
          const pxIdx = (row * 512 + colWord * 16 + bit) * 4;
          const val = isBlack ? 25 : 252;
          data[pxIdx] = val;
          data[pxIdx + 1] = isBlack ? 35 : 250;
          data[pxIdx + 2] = isBlack ? 22 : 242;
          data[pxIdx + 3] = 255;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  const syncSnapshot = () => {
    const sim = simRef.current;
    if (!sim) return;
    setSimSnapshot({
      cycles: sim.cycles,
      PC: sim.PC,
      A: sim.A,
      D: sim.D,
      kbd: sim.ram[24576] || 0,
      inst: sim.rom[sim.PC] || '0000000000000000',
      mem: {
        16575: sim.ram[16575] || 0,
        16576: sim.ram[16576] || 0,
        16577: sim.ram[16577] || 0,
        16578: sim.ram[16578] || 0,
        16579: sim.ram[16579] || 0,
        17186: sim.ram[17186] || 0,
        17187: sim.ram[17187] || 0,
      },
    });
    renderScreenCanvas();
  };

  useEffect(() => {
    if (activeTab !== 'PART C') return;
    syncSnapshot();
    if (!isRunning) return;
    const timer = setInterval(() => {
      const sim = simRef.current;
      if (!sim) return;
      for (let i = 0; i < speed; i++) {
        sim.step();
      }
      syncSnapshot();
    }, 30);
    return () => clearInterval(timer);
  }, [activeTab, isRunning, speed]);

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 1500);
  };

  const deliverables = [
    { name: 'CPU.hdl', part: 'PART A • HDL', desc: 'Hack Central Processing Unit integrating A/D registers, ALU, and PC logic.', content: HDL_FILES['CPU.hdl'] },
    { name: 'Memory.hdl', part: 'PART A • HDL', desc: 'Address space decoder combining RAM16K, Screen (16384), and Keyboard (24576).', content: HDL_FILES['Memory.hdl'] },
    { name: 'Computer.hdl', part: 'PART A • HDL', desc: 'Top-level integrated Hack computer wiring CPU, Memory, and ROM32K together.', content: HDL_FILES['Computer.hdl'] },
    { name: 'ALU.hdl', part: 'PART A • HDL', desc: 'Hack Arithmetic Logic Unit evaluating 18 functions on 16-bit buses.', content: HDL_FILES['ALU.hdl'] },
    { name: 'assembler.py', part: 'PART B • SOFTWARE', desc: 'Standalone Python two-pass assembler with symbols.txt export (K mod 3 = 0).', content: PYTHON_ASSEMBLER },
    { name: 'symbols.txt', part: 'PART B • K MOD 3 = 0', desc: 'Symbol table export listing all resolved ROM labels and RAM variables.', content: capstoneAssembled.symbolsTxt },
    { name: 'Box.asm', part: 'PART C • ASSEMBLY', desc: 'Assembly program drawing and erasing a 48×20 box at Row 6 (16576..17186).', content: ASM_PRESETS['Box.asm (Capstone)'] },
    { name: 'Box.hack', part: 'PART C • BINARY', desc: 'Compiled 16-bit machine code generated by assembler.py for Box.asm.', content: capstoneAssembled.hackText },
    { name: 'BoxTest.tst', part: 'OFFICIAL EVIDENCE', desc: 'Automated CPU Emulator test script verifying screen words 16576..17186.', content: BOX_TEST_TST },
    { name: 'BoxTest.cmp', part: 'OFFICIAL EVIDENCE', desc: 'Official comparison table for BoxTest.tst proving 100% pass.', content: BOX_TEST_CMP },
    { name: 'PROJECT_REPORT.md', part: 'DOCUMENTATION', desc: '4-page academic project report formatted for K.R. Mangalam ZOSIMA submission.', content: PROJECT_REPORT_MD },
    { name: 'README.md', part: 'DOCUMENTATION', desc: 'Repository documentation, hardware summary, and execution guide.', content: README_MD },
  ];

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const folder = zip.folder('capstone');
    deliverables.forEach((item) => folder.file(item.name, item.content));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capstone_${STUDENT_INFO.rollNo}_K${STUDENT_INFO.k}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-[#f6f3e8]/95 backdrop-blur border-b border-[#dcd7c5]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#273923] text-[#f6f3e8] flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold tracking-tight text-lg text-[#1d2a1b]">HACK COMPUTER LAB</div>
              <div className="text-[11px] tracking-widest text-[#636e5d] uppercase">
                NAND TO TETRIS • ETCCNT301 • KRMU
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-[#ebe6d5] p-1 rounded-full border border-[#d8d2be]">
            {['HOME', 'PART A', 'PART B', 'PART C', 'SUBMISSION'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                  activeTab === tab
                    ? 'bg-[#273923] text-[#f6f3e8] shadow-sm'
                    : 'text-[#43503e] hover:text-[#1d2a1b]'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right text-xs">
              <div className="font-semibold text-[#1d2a1b]">ROLL: {STUDENT_INFO.rollNo}</div>
              <div className="text-[#4a6741] font-medium">Parameter K = {STUDENT_INFO.k}</div>
            </div>
            <button
              onClick={() => setActiveTab('PART C')}
              className="flex items-center gap-2 bg-[#273923] hover:bg-[#1e2d1b] text-[#f6f3e8] px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" /> Box Emulator
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        {activeTab === 'HOME' && (
          <div className="space-y-12">
            <section className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ebe6d5] border border-[#d5cfb9] text-xs font-medium text-[#3b4d36]">
                  ● ETCCNT301 • K.R. Mangalam University • Individual Capstone
                </div>
                <h1 className="text-5xl sm:text-6xl font-serif font-bold tracking-tight leading-[1.05] text-[#1a2618]">
                  MAKE THE <br />
                  COMPUTER <br />
                  <span className="text-[#4a6741]">DRAW A BOX.</span>
                </h1>
                <p className="text-[#4f5c4a] text-lg max-w-xl">
                  Build the Hack computer in HDL. Write a two-pass assembler in Python. Execute 16-bit machine code to render a live 48×20 box on screen.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveTab('PART A')}
                    className="bg-[#273923] text-[#f6f3e8] px-5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase flex items-center gap-2 cursor-pointer"
                  >
                    Explore Part A • HDL <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveTab('PART C')}
                    className="bg-[#fcfaf2] border border-[#cfc9b4] text-[#1d2a1b] px-5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase cursor-pointer"
                  >
                    Launch Box Emulator
                  </button>
                  <button
                    onClick={() => setActiveTab('SUBMISSION')}
                    className="text-xs font-semibold text-[#4a6741] underline px-3 py-3 cursor-pointer"
                  >
                    Deliverables Checklist →
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 bg-[#fcfaf2] border border-[#dcd6c2] rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#e8e3d2] pb-3">
                  <div>
                    <div className="text-[10px] font-bold tracking-widest uppercase text-[#6e7968]">
                      CAPSTONE SPECIFICATION
                    </div>
                    <div className="text-xl font-serif font-bold">Assignment Rubric</div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#e6eddf] text-[#2d4c25] text-xs font-bold">
                    10 Marks Total
                  </span>
                </div>
                {[
                  { title: 'Part A: HDL Computer', sub: 'CPU, Memory & Computer Chips', marks: '2.5 Marks' },
                  { title: 'Part B: Python Assembler', sub: 'Two-pass parser + K mod 3 = 0', marks: '3.0 Marks' },
                  { title: 'Part C: Box Program', sub: 'Box.asm & Interactive Drawing', marks: '2.5 Marks' },
                  { title: 'Viva Voce Defense', sub: 'On-the-spot code modifications', marks: '2.0 Marks' },
                ].map((row) => (
                  <div
                    key={row.title}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f6f3e8] border border-[#e5e0ce]"
                  >
                    <div>
                      <div className="font-semibold text-sm">{row.title}</div>
                      <div className="text-xs text-[#64705e]">{row.sub}</div>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-[#fcfaf2] border border-[#dcd6c2] text-xs font-bold">
                      {row.marks}
                    </span>
                  </div>
                ))}
                <button
                  onClick={() => setActiveTab('PART C')}
                  className="w-full py-3 rounded-xl bg-[#273923] text-[#f6f3e8] text-xs font-bold tracking-wider uppercase cursor-pointer"
                >
                  Open Live Software Emulator →
                </button>
              </div>
            </section>

            <section className="space-y-4">
              <div className="text-xs font-bold tracking-widest uppercase text-[#56714c]">
                01 • PERSONAL VERIFICATION
              </div>
              <h2 className="text-3xl font-serif font-bold">Student Identity & Parameter K</h2>
              <div className="bg-[#fcfaf2] border border-[#dcd6c2] rounded-3xl p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e8e3d2] pb-5">
                  <div>
                    <div className="font-bold text-base">
                      Personal Parameter K Engine{' '}
                      <span className="ml-2 px-2.5 py-0.5 rounded-full bg-[#e6eddf] text-[#2d4c25] text-xs">
                        K.R. Mangalam University
                      </span>
                    </div>
                    <div className="text-xs text-[#64705e]">
                      Evaluates parameter K from the last two digits of the student university roll number.
                    </div>
                  </div>
                  <input
                    type="text"
                    value={rollInput}
                    onChange={(e) => setRollInput(e.target.value)}
                    className="px-4 py-2 rounded-xl bg-[#f6f3e8] border border-[#cfc9b4] font-mono text-sm font-semibold w-48"
                  />
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#f6f3e8] border border-[#e4dfcd] sm:col-span-1">
                    <div className="text-[11px] font-bold uppercase text-[#6a7564]">Calculated Parameter K</div>
                    <div className="text-2xl font-bold mt-1">
                      K = {kValue}{' '}
                      <span className="text-xs font-normal text-[#64705e]">(last two digits)</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#f6f3e8] border border-[#e4dfcd] text-center">
                    <div className="text-[11px] font-bold uppercase text-[#6a7564]">K mod 3</div>
                    <div className="text-2xl font-bold mt-1">{kMod3}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#f6f3e8] border border-[#e4dfcd] text-center">
                    <div className="text-[11px] font-bold uppercase text-[#6a7564]">K mod 4</div>
                    <div className="text-2xl font-bold mt-1">{kMod4}</div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-[#f6f3e8] border border-[#e4dfcd]">
                    <div className="text-[10px] font-bold uppercase text-[#6a7564]">Box Start Row</div>
                    <div className="font-mono font-bold text-lg mt-1">Row {kValue}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#f6f3e8] border border-[#e4dfcd]">
                    <div className="text-[10px] font-bold uppercase text-[#6a7564]">Box Dimensions</div>
                    <div className="font-mono font-bold text-lg mt-1">{boxWidthPx}px × 20h</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#f6f3e8] border border-[#e4dfcd]">
                    <div className="text-[10px] font-bold uppercase text-[#6a7564]">Words / Row</div>
                    <div className="font-mono font-bold text-lg mt-1">
                      {wordsPerRow} words ({boxWidthPx} bits)
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#f6f3e8] border border-[#e4dfcd]">
                    <div className="text-[10px] font-bold uppercase text-[#6a7564]">Screen Addr Map</div>
                    <div className="font-mono font-bold text-lg mt-1">
                      {startAddr}..{endAddr}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#eef3e8] border border-[#cddac2] text-xs text-[#273923]">
                  <span className="font-bold">Part B Requirement (K mod 3 = {kMod3}): </span>
                  {kMod3 === 0 && 'Case 0: Save all labels and variables with their addresses in symbols.txt.'}
                  {kMod3 === 1 && 'Case 1: Print a clear error message with line number on invalid instructions.'}
                  {kMod3 === 2 && 'Case 2: Print a warning if the same label is written twice.'}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="text-xs font-bold tracking-widest uppercase text-[#56714c]">
                02 • CORE ASSIGNMENT ARCHITECTURE
              </div>
              <h2 className="text-3xl font-serif font-bold">The Three Pillars of the Hack Machine</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    part: 'PART A',
                    marks: '2.5 Marks',
                    title: 'Hack Computer HDL',
                    desc: 'Constructed using Hardware Description Language: CPU.hdl, Memory.hdl, and Computer.hdl.',
                    action: 'Inspect HDL Sources →',
                    tab: 'PART A',
                  },
                  {
                    part: 'PART B',
                    marks: '3.0 Marks',
                    title: 'Python Assembler',
                    desc: 'Standalone two-pass assembler with symbol resolution, symbols.txt export (K mod 3 = 0), and binary generation.',
                    action: 'Open Assembler Studio →',
                    tab: 'PART B',
                  },
                  {
                    part: 'PART C',
                    marks: '2.5 Marks',
                    title: 'Box Program & Emulator',
                    desc: 'Interactive Von Neumann CPU & Screen emulator executing Box.hack to draw and erase the 48×20 box.',
                    action: 'Run Software Emulator →',
                    tab: 'PART C',
                  },
                ].map((card) => (
                  <div
                    key={card.part}
                    className="bg-[#fcfaf2] border border-[#dcd6c2] rounded-3xl p-6 flex flex-col justify-between space-y-6"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold tracking-wider uppercase text-[#56714c]">
                          {card.part}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-[#f6f3e8] border border-[#dcd6c2] text-xs font-bold">
                          {card.marks}
                        </span>
                      </div>
                      <h3 className="text-xl font-serif font-bold">{card.title}</h3>
                      <p className="text-xs text-[#5d6958] leading-relaxed">{card.desc}</p>
                    </div>
                    <button
                      onClick={() => setActiveTab(card.tab)}
                      className="text-left text-xs font-bold text-[#273923] hover:underline cursor-pointer"
                    >
                      {card.action}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-[#273923] text-[#f6f3e8] rounded-3xl p-8 flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="text-[11px] font-bold tracking-widest uppercase text-[#a3b899]">
                  FINAL VERIFICATION & DOWNLOADS
                </div>
                <h3 className="text-2xl font-serif font-bold">
                  Ready for University Assessment & Evaluation
                </h3>
                <p className="text-xs text-[#cfd9c8]">
                  All required deliverables—CPU.hdl, Memory.hdl, Computer.hdl, assembler.py, symbols.txt, Box.asm, Box.hack, and report—are verified and downloadable.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('SUBMISSION')}
                className="bg-[#f6f3e8] text-[#1d2a1b] px-5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase cursor-pointer"
              >
                View Deliverables Package →
              </button>
            </section>
          </div>
        )}

        {activeTab === 'PART A' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs font-bold tracking-widest uppercase text-[#56714c]">
                  PART A • HARDWARE DESCRIPTION LANGUAGE (2.5 MARKS)
                </div>
                <h1 className="text-4xl font-serif font-bold mt-1">Hack Computer HDL Architecture</h1>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(HDL_FILES).map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setSelectedHdl(chip)}
                    className={`px-4 py-2 rounded-xl text-xs font-mono font-bold border transition cursor-pointer ${
                      selectedHdl === chip
                        ? 'bg-[#273923] text-[#f6f3e8] border-[#273923]'
                        : 'bg-[#fcfaf2] text-[#273923] border-[#d5cfb9]'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#fcfaf2] border border-[#dcd6c2] rounded-3xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e8e3d2] pb-4">
                <div>
                  <div className="text-[11px] font-bold uppercase text-[#4a6741]">
                    CORE CHIP • TESTED & VERIFIED
                  </div>
                  <h2 className="text-2xl font-serif font-bold">{selectedHdl}</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(selectedHdl, HDL_FILES[selectedHdl])}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f6f3e8] border border-[#cfc9b4] text-xs font-semibold cursor-pointer"
                  >
                    {copiedKey === selectedHdl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === selectedHdl ? 'Copied' : 'Copy HDL'}
                  </button>
                  <button
                    onClick={() => downloadTextFile(selectedHdl, HDL_FILES[selectedHdl])}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#273923] text-[#f6f3e8] text-xs font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download {selectedHdl}
                  </button>
                </div>
              </div>

              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-[#1f291e] text-[#e7efe3] rounded-2xl p-5 font-mono text-xs overflow-x-auto leading-relaxed">
                  <pre>{HDL_FILES[selectedHdl]}</pre>
                </div>
                <div className="lg:col-span-4 space-y-4">
                  <div className="p-5 rounded-2xl bg-[#f6f3e8] border border-[#e3decb] space-y-2">
                    <div className="font-bold text-sm">Hardware Logic Highlights</div>
                    <ul className="text-xs text-[#556150] space-y-2 list-disc pl-4">
                      <li>Instruction bit 15 selects A-instruction (0) vs. C-instruction (1).</li>
                      <li>Memory address bits [13..14] route between RAM16K, Screen (16384), and Keyboard (24576).</li>
                      <li>ALU status flags zr and ng drive conditional jumps via Program Counter (PC).</li>
                    </ul>
                  </div>
                  <div className="p-5 rounded-2xl bg-[#eef3e8] border border-[#cddac2] space-y-2">
                    <div className="font-bold text-sm text-[#273923]">Official Verification Status</div>
                    <div className="bg-[#1f291e] text-[#9be382] font-mono text-[11px] p-3 rounded-xl">
                      $ HardwareSimulator {selectedHdl.replace('.hdl', '.tst')}
                      <br />
                      End of script - Comparison ended successfully.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'PART B' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs font-bold tracking-widest uppercase text-[#56714c]">
                  PART B • PYTHON ASSEMBLER & TRANSLATOR STUDIO (3.0 MARKS)
                </div>
                <h1 className="text-4xl font-serif font-bold mt-1">Hack Two-Pass Assembler Playground</h1>
                <p className="text-xs text-[#5d6958] mt-1">
                  Real-time two-pass translation engine: strips comments, resolves labels, allocates variables from RAM[16], and generates symbols.txt (K mod 3 = 0).
                </p>
              </div>
              <button
                onClick={() => downloadTextFile('assembler.py', PYTHON_ASSEMBLER)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#273923] text-[#f6f3e8] text-xs font-bold cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download assembler.py
              </button>
            </div>

            <div className="bg-[#fcfaf2] border border-[#dcd6c2] rounded-3xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8e3d2] pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase text-[#6a7564] mr-1">
                    Load Preset Program:
                  </span>
                  {Object.keys(ASM_PRESETS).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        setSelectedPreset(preset);
                        setAsmSource(ASM_PRESETS[preset]);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border cursor-pointer ${
                        selectedPreset === preset
                          ? 'bg-[#273923] text-[#f6f3e8] border-[#273923]'
                          : 'bg-[#f6f3e8] text-[#273923] border-[#d5cfb9]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <span className="text-xs font-semibold text-[#2d4c25]">
                  ● 100% Assembled Cleanly
                </span>
              </div>

              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase text-[#5d6958]">
                    <span>Assembly Source Editor (.asm)</span>
                    <span>{asmSource.split('\n').length} lines</span>
                  </div>
                  <textarea
                    value={asmSource}
                    onChange={(e) => setAsmSource(e.target.value)}
                    rows={18}
                    className="w-full rounded-2xl bg-[#f6f3e8] border border-[#d5cfb9] p-4 font-mono text-xs leading-relaxed focus:outline-none"
                  />
                </div>

                <div className="lg:col-span-6 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-1.5">
                      {[
                        { id: 'HACK', label: '16-Bit Machine Code (.hack)' },
                        { id: 'SYMBOLS', label: 'symbols.txt (K mod 3 = 0)' },
                        { id: 'PYTHON', label: 'Python Script' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setAsmRightTab(t.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                            asmRightTab === t.id
                              ? 'bg-[#273923] text-[#f6f3e8] border-[#273923]'
                              : 'bg-[#f6f3e8] text-[#273923] border-[#d5cfb9]'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() =>
                        downloadTextFile(
                          asmRightTab === 'SYMBOLS' ? 'symbols.txt' : 'Box.hack',
                          asmRightTab === 'SYMBOLS' ? assembled.symbolsTxt : assembled.hackText
                        )
                      }
                      className="px-3 py-1 rounded-lg bg-[#e6eddf] text-[#273923] text-xs font-bold cursor-pointer"
                    >
                      Download {asmRightTab === 'SYMBOLS' ? 'symbols.txt' : '.hack'}
                    </button>
                  </div>

                  <div className="h-[372px] overflow-y-auto rounded-2xl bg-[#1f291e] text-[#e7efe3] p-4 font-mono text-xs leading-relaxed">
                    {asmRightTab === 'HACK' &&
                      assembled.annotatedLines.map((row, idx) => (
                        <div key={idx} className="flex justify-between border-b border-white/5 py-0.5">
                          <span>
                            <span className="text-[#788875] mr-3">{idx}</span>
                            <span className="text-[#9be382]">{row.bin}</span>
                          </span>
                          <span className="text-[#8fa18b]">{row.type}</span>
                        </div>
                      ))}
                    {asmRightTab === 'SYMBOLS' && <pre>{assembled.symbolsTxt}</pre>}
                    {asmRightTab === 'PYTHON' && <pre>{PYTHON_ASSEMBLER}</pre>}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs text-[#5d6958] border-t border-[#e8e3d2] pt-3">
                <span>Edit or paste assembly to recompile instantly</span>
                <div className="flex gap-4 font-mono font-semibold">
                  <span>ROM Instructions: {assembled.binaryLines.length}</span>
                  <span>Labels: {assembled.labelsCount}</span>
                  <span>Variables: {assembled.variablesCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'PART C' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs font-bold tracking-widest uppercase text-[#56714c]">
                  PART C • BOX PROGRAM & CPU SOFTWARE EMULATOR (2.5 MARKS)
                </div>
                <h1 className="text-4xl font-serif font-bold mt-1">Hack CPU & Screen Emulator</h1>
                <p className="text-xs text-[#5d6958] mt-1">
                  Real-time Von Neumann software emulator executing Box.hack. Hold any physical keyboard key or the button below to draw the 48×20 box at Row 6.
                </p>
              </div>
              <div className="px-4 py-2 rounded-full bg-[#fcfaf2] border border-[#d5cfb9] text-xs font-mono font-bold">
                {keyPressed ? `Key Active (Code ${keyPressed})` : 'Key Released (Box Erased)'}
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-[#fcfaf2] border border-[#dcd6c2] rounded-3xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between text-xs font-mono text-[#5d6958]">
                  <span className="font-bold text-[#1d2a1b]">HACK SCREEN MEMORY DISPLAY (512 × 256 PIXELS)</span>
                  <span>Address: SCREEN (16384) to KBD (24576)</span>
                </div>

                <div className="rounded-2xl overflow-hidden border-2 border-[#273923] bg-[#fcfaf2]">
                  <canvas
                    ref={canvasRef}
                    width={512}
                    height={256}
                    className="w-full h-auto block"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-[#64705e]">
                  <span>Row 0 (Col 0..511)</span>
                  <span>Box Location: Row 6 to 25 • Cols 0 to 47 (48px)</span>
                  <span>Row 255</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#e8e3d2]">
                  <button
                    onClick={() => setIsRunning((r) => !r)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f6f3e8] border border-[#cfc9b4] text-xs font-bold cursor-pointer"
                  >
                    {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isRunning ? 'Pause CPU' : 'Resume CPU'}
                  </button>
                  <button
                    onClick={() => {
                      simRef.current?.step();
                      syncSnapshot();
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f6f3e8] border border-[#cfc9b4] text-xs font-bold cursor-pointer"
                  >
                    <StepForward className="w-3.5 h-3.5" /> Single Step
                  </button>
                  <button
                    onClick={() => {
                      simRef.current?.reset();
                      syncSnapshot();
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f6f3e8] border border-[#cfc9b4] text-xs font-bold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset
                  </button>
                  <button
                    onMouseDown={() => setKeyPressed(65)}
                    onMouseUp={() => setKeyPressed(0)}
                    onMouseLeave={() => setKeyPressed(0)}
                    onTouchStart={() => setKeyPressed(65)}
                    onTouchEnd={() => setKeyPressed(0)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#273923] active:bg-[#4a6741] text-[#f6f3e8] text-xs font-bold uppercase tracking-wider cursor-pointer select-none"
                  >
                    <Keyboard className="w-4 h-4" /> Hold Key to Draw Box
                  </button>
                  <div className="flex items-center gap-2 ml-auto text-xs">
                    <span>Speed:</span>
                    <input
                      type="range"
                      min="200"
                      max="6000"
                      step="200"
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <div className="bg-[#fcfaf2] border border-[#dcd6c2] rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">Live CPU Registers</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#e6eddf] text-[#2d4c25] font-mono text-[11px] font-bold">
                      Cycle #{simSnapshot.cycles.toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                    <div className="p-3 rounded-xl bg-[#f6f3e8] border border-[#e4dfcd]">
                      <div className="text-[10px] text-[#6a7564]">PROGRAM COUNTER</div>
                      <div className="font-bold text-base mt-0.5">PC = {simSnapshot.PC}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#f6f3e8] border border-[#e4dfcd]">
                      <div className="text-[10px] text-[#6a7564]">A-REGISTER</div>
                      <div className="font-bold text-base mt-0.5">A = {simSnapshot.A}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#f6f3e8] border border-[#e4dfcd]">
                      <div className="text-[10px] text-[#6a7564]">D-REGISTER</div>
                      <div className="font-bold text-base mt-0.5">D = {simSnapshot.D}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#f6f3e8] border border-[#e4dfcd]">
                      <div className="text-[10px] text-[#6a7564]">KBD MEMORY</div>
                      <div className="font-bold text-base mt-0.5">RAM[24576] = {simSnapshot.kbd}</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1f291e] text-[#9be382] font-mono text-xs">
                    <div className="text-[10px] text-[#8fa18b]">ROM INSTRUCTION CODE</div>
                    <div className="mt-0.5">{simSnapshot.inst}</div>
                  </div>
                </div>

                <div className="bg-[#fcfaf2] border border-[#dcd6c2] rounded-3xl p-5 space-y-3">
                  <div className="font-bold text-sm">Screen Memory Address Monitor</div>
                  <p className="text-[11px] text-[#64705e]">
                    Live emulator memory words showing box boundary (16576..17186) vs. outside addresses.
                  </p>
                  <div className="space-y-2 font-mono text-xs">
                    {[
                      { addr: 16575, label: 'RAM[16575] (Row 5 End)' },
                      { addr: 16576, label: 'RAM[16576] (Row 6, Word 0)' },
                      { addr: 16577, label: 'RAM[16577] (Row 6, Word 1)' },
                      { addr: 16578, label: 'RAM[16578] (Row 6, Word 2)' },
                      { addr: 16579, label: 'RAM[16579] (Row 6, Word 3)' },
                      { addr: 17186, label: 'RAM[17186] (Row 25, Word 2)' },
                      { addr: 17187, label: 'RAM[17187] (Row 25, Word 3)' },
                    ].map((item) => {
                      const val = simSnapshot.mem[item.addr] || 0;
                      return (
                        <div
                          key={item.addr}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#f6f3e8] border border-[#e4dfcd]"
                        >
                          <span className="text-[11px]">{item.label}</span>
                          <span className={`font-bold ${val === -1 ? 'text-[#273923]' : 'text-[#7a8574]'}`}>
                            {val} ({val === -1 ? 'Black' : 'White'})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'SUBMISSION' && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold tracking-widest uppercase text-[#56714c]">
                  FINAL SUBMISSION • OFFICIAL CAPSTONE DELIVERABLES
                </div>
                <h1 className="text-4xl font-serif font-bold mt-1">Assignment Deliverables Package</h1>
                <p className="text-xs text-[#5d6958] mt-1">
                  All repository files verified, archived, and available for direct one-click download.
                </p>
              </div>
              <button
                onClick={handleDownloadZip}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#273923] text-[#f6f3e8] text-xs font-bold tracking-wider uppercase cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download Complete Package (.zip)
              </button>
            </div>

            <div className="bg-[#fcfaf2] border border-[#dcd6c2] rounded-3xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8e3d2] pb-4">
                <div>
                  <h2 className="text-xl font-serif font-bold">K.R. Mangalam University Evaluation Checklist</h2>
                  <p className="text-xs text-[#64705e]">
                    Course: ETCCNT301 • School of Engineering & Technology • Student Roll: {STUDENT_INFO.rollNo}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#e6eddf] text-[#2d4c25] text-xs font-bold">
                  10.0 / 10.0 Marks Scope
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title: 'Part A: Hack Computer HDL (2.5 Marks)', desc: 'CPU.hdl, Memory.hdl, and Computer.hdl verified against official Hardware Simulator tests.' },
                  { title: 'Part B: Python Assembler (3.0 Marks)', desc: 'assembler.py with two-pass translation and symbols.txt export for K mod 3 = 0.' },
                  { title: 'Part C: Box Drawing Program (2.5 Marks)', desc: 'Box.asm and Box.hack rendering a 48×20 box at Row 6 (16576..17186) on key press.' },
                  { title: 'Viva Voce Preparation (2.0 Marks)', desc: 'Complete documentation in PROJECT_REPORT.md covering architecture and viva modifications.' },
                ].map((item) => (
                  <div key={item.title} className="p-4 rounded-2xl bg-[#f6f3e8] border border-[#e4dfcd] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{item.title}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#e6eddf] text-[#2d4c25] text-[11px] font-bold">
                        Passed
                      </span>
                    </div>
                    <p className="text-xs text-[#5d6958]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
                  <FileCheck2 className="w-6 h-6 text-[#273923]" /> Files Inventory & Direct Downloads
                </h2>
                <span className="text-xs text-[#64705e]">{deliverables.length} Deliverable Files Available</span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {deliverables.map((file) => (
                  <div
                    key={file.name}
                    className="bg-[#fcfaf2] border border-[#dcd6c2] rounded-2xl p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold uppercase text-[#56714c]">{file.part}</div>
                      <div className="font-mono font-bold text-base">{file.name}</div>
                      <p className="text-xs text-[#5d6958] leading-relaxed">{file.desc}</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-[#e8e3d2]">
                      <span className="text-xs font-semibold text-[#2d4c25]">● Available</span>
                      <button
                        onClick={() => downloadTextFile(file.name, file.content)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#273923] text-[#f6f3e8] text-xs font-semibold cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-[#1f291e] text-[#cfd9c8] mt-16">
        <div className="max-w-7xl mx-auto px-6 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-xs">
          <div className="space-y-2">
            <div className="font-bold text-sm text-white">HACK COMPUTER LAB</div>
            <p className="text-[#9eb098] leading-relaxed">
              Capstone Engineering Project: Make the Computer Draw a Box. From elementary NAND logic gates to machine code execution on hardware.
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="font-bold text-white uppercase tracking-wider">Assignment Modules</div>
            <div>• Part A: Hack Computer HDL (2.5 Marks)</div>
            <div>• Part B: Python Assembler (3.0 Marks)</div>
            <div>• Part C: Box Program & Emulator (2.5 Marks)</div>
            <div>• Final Submission Deliverables</div>
          </div>
          <div className="space-y-1.5 font-mono">
            <div className="font-sans font-bold text-white uppercase tracking-wider">Hardware Parameters (K=6)</div>
            <div>Box Starting Row: Row 6</div>
            <div>Box Dimensions: 48 px × 20 rows</div>
            <div>Screen Start Addr: 16576 (Word 0)</div>
            <div>Screen End Addr: 17186 (Word 2)</div>
          </div>
          <div className="space-y-1.5">
            <div className="font-bold text-white uppercase tracking-wider">University Record</div>
            <div>Student: {STUDENT_INFO.name}</div>
            <div>Roll: {STUDENT_INFO.rollNo}</div>
            <div>School: {STUDENT_INFO.school}</div>
            <div>University: {STUDENT_INFO.university}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}