import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import React, { useCallback, useEffect, useRef, useState } from 'react';

// Morse code timing constants (in milliseconds)
const TIMING = {
    DOT_MIN: 50,
    DOT_MAX: 200,
    DASH_MIN: 200,
    DASH_MAX: 600,
    GAP_LETTER: 300,  // Gap between letters
    GAP_WORD: 700,    // Gap between words
    START_CODON: '.-.-',  // Start sequence (similar to prosign SK)
};

// Standard morse code dictionary
const MORSE_TO_CHAR: { [key: string]: string } = {
    '.-': 'A',
    '-...': 'B',
    '-.-.': 'C',
    '-..': 'D',
    '.': 'E',
    '..-.': 'F',
    '--.': 'G',
    '....': 'H',
    '..': 'I',
    '.---': 'J',
    '-.-': 'K',
    '.-..': 'L',
    '--': 'M',
    '-.': 'N',
    '---': 'O',
    '.--.': 'P',
    '--.-': 'Q',
    '.-.': 'R',
    '...': 'S',
    '-': 'T',
    '..-': 'U',
    '...-': 'V',
    '.--': 'W',
    '-..-': 'X',
    '-.--': 'Y',
    '--..': 'Z',
    '-----': '0',
    '.----': '1',
    '..---': '2',
    '...--': '3',
    '....-': '4',
    '.....': '5',
    '-....': '6',
    '--...': '7',
    '---..': '8',
    '----.': '9',
};

interface Signal {
    type: 'dot' | 'dash' | 'gap';
    duration: number;
    timestamp: number;
}

export const MorseCodeRecorder: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [currentMorse, setCurrentMorse] = useState('');
    const [decodedText, setDecodedText] = useState('');
    const [statusMessage, setStatusMessage] = useState('Press Start to begin recording');
    const [signals, setSignals] = useState<Signal[]>([]);
    const [startCodonDetected, setStartCodonDetected] = useState(false);

    const pressStartTime = useRef<number | null>(null);
    const lastReleaseTime = useRef<number | null>(null);
    const currentLetterMorse = useRef<string>('');
    const bufferMorse = useRef<string>('');
    const gapTimer = useRef<NodeJS.Timeout | null>(null);

    // Classify signal duration as dot or dash
    const classifySignal = (duration: number): 'dot' | 'dash' | null => {
        if (duration >= TIMING.DOT_MIN && duration <= TIMING.DOT_MAX) {
            return 'dot';
        } else if (duration >= TIMING.DASH_MIN && duration <= TIMING.DASH_MAX) {
            return 'dash';
        }
        return null;
    };

    // Decode morse code to character
    const decodeMorse = (morse: string): string | null => {
        return MORSE_TO_CHAR[morse] || null;
    };

    // Check if the buffer contains the start codon
    const checkStartCodon = (morse: string): boolean => {
        return morse.endsWith(TIMING.START_CODON);
    };

    // Process the current letter
    const processCurrentLetter = useCallback(() => {
        if (currentLetterMorse.current.length === 0) return;

        const char = decodeMorse(currentLetterMorse.current);

        if (!startCodonDetected) {
            // Check if we've detected the start codon
            bufferMorse.current += currentLetterMorse.current;
            if (checkStartCodon(bufferMorse.current)) {
                setStartCodonDetected(true);
                setStatusMessage('Start codon detected! Recording active...');
                bufferMorse.current = '';
                setDecodedText('');
            }
        } else {
            // We're past the start codon, decode normally
            if (char) {
                setDecodedText((prev) => prev + char);
                setCurrentMorse('');
            } else {
                setStatusMessage(`Unknown morse: ${currentLetterMorse.current}`);
            }
        }

        currentLetterMorse.current = '';
    }, [startCodonDetected]);

    // Process word gap
    const processWordGap = useCallback(() => {
        processCurrentLetter();
        if (startCodonDetected) {
            setDecodedText((prev) => prev + ' ');
        }
    }, [processCurrentLetter, startCodonDetected]);

    // Handle key down (space pressed)
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.code !== 'Space' || !isListening || pressStartTime.current !== null) return;
        e.preventDefault();

        pressStartTime.current = Date.now();

        // Clear any pending gap timer
        if (gapTimer.current) {
            clearTimeout(gapTimer.current);
            gapTimer.current = null;
        }

        // Calculate gap if there was a previous release
        if (lastReleaseTime.current) {
            const gapDuration = pressStartTime.current - lastReleaseTime.current;

            if (gapDuration >= TIMING.GAP_WORD) {
                processWordGap();
            } else if (gapDuration >= TIMING.GAP_LETTER) {
                processCurrentLetter();
            }
        }
    }, [isListening, processCurrentLetter, processWordGap]);

    // Handle key up (space released)
    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        if (e.code !== 'Space' || !isListening || pressStartTime.current === null) return;
        e.preventDefault();

        const releaseTime = Date.now();
        const duration = releaseTime - pressStartTime.current;

        const signalType = classifySignal(duration);

        if (signalType) {
            const symbol = signalType === 'dot' ? '.' : '-';
            currentLetterMorse.current += symbol;
            setCurrentMorse(currentLetterMorse.current);

            setSignals((prev) => [
                ...prev,
                { type: signalType, duration, timestamp: releaseTime },
            ]);
        }

        lastReleaseTime.current = releaseTime;
        pressStartTime.current = null;

        // Set a timer to process the letter if no more input comes
        gapTimer.current = setTimeout(() => {
            processCurrentLetter();
            setCurrentMorse('');
        }, TIMING.GAP_LETTER);
    }, [isListening, processCurrentLetter]);

    // Setup keyboard listeners
    useEffect(() => {
        if (isListening) {
            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyUp);

            return () => {
                window.removeEventListener('keydown', handleKeyDown);
                window.removeEventListener('keyup', handleKeyUp);
                if (gapTimer.current) {
                    clearTimeout(gapTimer.current);
                }
            };
        }
        return undefined;
    }, [isListening, handleKeyDown, handleKeyUp]);

    const startRecording = () => {
        setIsListening(true);
        setIsRecording(true);
        setDecodedText('');
        setCurrentMorse('');
        setSignals([]);
        setStartCodonDetected(false);
        setStatusMessage(`Waiting for start codon: ${TIMING.START_CODON} (. - . -)`);
        currentLetterMorse.current = '';
        bufferMorse.current = '';
        lastReleaseTime.current = null;
        pressStartTime.current = null;
    };

    const stopRecording = () => {
        setIsListening(false);
        setIsRecording(false);
        setStatusMessage('Recording stopped');
        processCurrentLetter();
        if (gapTimer.current) {
            clearTimeout(gapTimer.current);
            gapTimer.current = null;
        }
    };

    const reset = () => {
        stopRecording();
        setDecodedText('');
        setCurrentMorse('');
        setSignals([]);
        setStartCodonDetected(false);
        setStatusMessage('Press Start to begin recording');
        currentLetterMorse.current = '';
        bufferMorse.current = '';
    };

    return (
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Morse Code Recorder
                    {isRecording && (
                        <Badge variant={startCodonDetected ? "default" : "secondary"}>
                            {startCodonDetected ? 'Recording Active' : 'Waiting for Start Codon'}
                        </Badge>
                    )}
                </CardTitle>
                <CardDescription>
                    Press and hold SPACE to record morse code signals. Start with the sequence: . - . - (dot dash dot dash)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Control Buttons */}
                <div className="flex gap-2">
                    {!isRecording ? (
                        <Button onClick={startRecording}>
                            Start Recording
                        </Button>
                    ) : (
                        <Button onClick={stopRecording} variant="destructive">
                            Stop Recording
                        </Button>
                    )}
                    <Button onClick={reset} variant="outline">
                        Reset
                    </Button>
                </div>

                {/* Status Message */}
                <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">{statusMessage}</p>
                </div>

                {/* Current Morse Input */}
                {currentMorse && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-md">
                        <p className="text-xs text-muted-foreground mb-1">Current Letter:</p>
                        <p className="text-2xl font-mono font-bold tracking-widest">{currentMorse}</p>
                    </div>
                )}

                {/* Decoded Text */}
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-md min-h-[100px]">
                    <p className="text-xs text-muted-foreground mb-2">Decoded Text:</p>
                    <p className="text-xl font-mono break-words">
                        {decodedText || (startCodonDetected ? '(waiting for input...)' : '(waiting for start codon...)')}
                    </p>
                </div>

                {/* Signal History */}
                {signals.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Recent Signals:</p>
                        <div className="flex flex-wrap gap-1">
                            {signals.slice(-20).map((signal, idx) => (
                                <Badge
                                    key={idx}
                                    variant={signal.type === 'dot' ? 'default' : 'secondary'}
                                    className="text-xs"
                                >
                                    {signal.type === 'dot' ? '.' : '-'} ({signal.duration}ms)
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Timing Reference */}
                <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
                    <p className="font-semibold">Timing Guidelines:</p>
                    <p>• Dot: {TIMING.DOT_MIN}-{TIMING.DOT_MAX}ms</p>
                    <p>• Dash: {TIMING.DASH_MIN}-{TIMING.DASH_MAX}ms</p>
                    <p>• Letter gap: {TIMING.GAP_LETTER}ms</p>
                    <p>• Word gap: {TIMING.GAP_WORD}ms</p>
                    <p className="font-semibold mt-2">Start Codon: {TIMING.START_CODON} (. - . -)</p>
                </div>
            </CardContent>
        </Card>
    );
};
