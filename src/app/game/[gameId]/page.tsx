// frontend/app/game/[gameId]/page.tsx
'use client'; // กำหนดให้เป็น Client Component เพื่อใช้ Hooks เช่น useState, useEffect

import { useEffect, useState  } from 'react';
import { useParams } from 'next/navigation'; // สำหรับดึงค่า gameId จาก URL
import { useRouter } from 'next/navigation'; // สำหรับ Redirect
// Import types ที่ถูกต้องจาก frontend/src/types.ts
import {
    GameState,
    ServerMessageType,
    ClientMessageType,
    CardValue,
    CardPlayedValidationMessage,
} from '@/app/types';

export default function GameRoomPage() {
    const params = useParams(); // Hook จาก Next.js สำหรับดึง params จาก URL
    const router = useRouter(); // Hook จาก Next.js สำหรับการ navigate
    const gameId = params.gameId as string; // ดึง gameId จาก URL

    // State สำหรับเก็บสถานะเกมปัจจุบัน
    const [gameState, setGameState] = useState<GameState | null>(null);
    // State สำหรับเก็บ WebSocket instance
    const [gameWs, setGameWs] = useState<WebSocket | null>(null);


    // Effect Hook สำหรับจัดการ WebSocket Connection และการดึงข้อมูลเริ่มต้น
    useEffect(() => {
        let myPlayerId: string | null = null;
        let myPlayerName: string | null = null;

        // ตรวจสอบ localStorage ใน useEffect เพื่อให้แน่ใจว่าโค้ดทำงานบน client-side เท่านั้น
        // และดึงค่า playerId กับ playerName ที่เราบันทึกไว้จากหน้า Lobby/Login
        if (typeof window !== 'undefined') {
            myPlayerId = localStorage.getItem('playerId');
            myPlayerName = localStorage.getItem('playerName');
        }

        // หากไม่มี playerId หรือ playerName ใน localStorage ให้ redirect กลับไปหน้า Lobby (Login)
        if (!myPlayerId || !myPlayerName) {
            console.warn('Player ID or Name not found in localStorage. Redirecting to lobby.');
            router.push('/lobby');
            return; // หยุดการทำงานของ Effect นี้
        }
        // ตรวจสอบว่ามี gameId หรือไม่ ถ้าไม่มีก็ไม่ต้องทำอะไร
        if (!gameId) return;

        // สร้าง WebSocket Connection ไปยัง Backend สำหรับห้องเกมนี้
        // URL ต้องตรงกับที่ Hono Server ของเราเปิด WebSocket Endpoint ไว้
        const socket = new WebSocket(`ws://localhost:5000/ws/game?gameId=${gameId}&playerId=${myPlayerId}&playerName=${myPlayerName}`);

        // Event handler เมื่อ WebSocket Connection เปิด
        socket.onopen = () => {
            console.log(`Connected to game WS: ${gameId}`);
            // Backend จะส่ง GameState มาให้ทันทีเมื่อเชื่อมต่อสำเร็จ
        };

        // Event handler เมื่อได้รับข้อความจาก Server ผ่าน WebSocket
        socket.onmessage = (event) => {
            const message = JSON.parse(event.data); // แปลง JSON string เป็น JavaScript object
            console.log('Game WS Message:', message);

            // ใช้ switch case เพื่อจัดการข้อความแต่ละประเภทจาก Server
            switch (message.type) {
                case ServerMessageType.GAME_STATE_UPDATE:
                    // เมื่อได้รับสถานะเกมอัปเดตเต็มรูปแบบ
                    setGameState(message.payload as GameState); // อัปเดต State ของเกม
                    break;
                case ServerMessageType.ERROR:
                    // เมื่อ Server ส่งข้อความ Error มา
                    alert(`Server Error: ${message.message}`);
                    console.error('Server Error:', message.message);
                    break;
                case ServerMessageType.PLAYER_LEFT:
                    // เมื่อมีผู้เล่นออกจากเกม (อาจจะแจ้งเตือนหรืออัปเดต UI เล็กน้อย)
                    alert(`Player ${(message as any).playerId} left the game.`);
                    // สถานะเกมจะถูกอัปเดตผ่าน GAME_STATE_UPDATE อีกที
                    break;
                case ServerMessageType.CARD_PLAYED_VALIDATION:
                    // ผลการลงไพ่ (ว่าถูกต้องหรือไม่, เสียพลังชีวิตเท่าไหร่)
                    const validationMsg = message as CardPlayedValidationMessage;
                    alert(`Action: ${validationMsg.message}`);
                    // สถานะเกมจะถูกอัปเดตผ่าน GAME_STATE_UPDATE อีกที
                    break;
                default:
                    // ข้อความประเภทอื่นที่ไม่รู้จัก
                    console.warn('Unhandled game message type:', message.type);
            }
        };

        // Event handler เมื่อ WebSocket Connection ถูกปิด
        socket.onclose = () => {
            console.log(`Disconnected from game WS: ${gameId}`);
            setGameWs(null); // ล้าง WebSocket instance
            alert('Disconnected from game. Returning to lobby.');
            router.push('/lobby'); // Redirect กลับไปหน้า Lobby
        };

        // Event handler เมื่อเกิด Error กับ WebSocket
        socket.onerror = (error) => {
            console.error(`Game WS error for ${gameId}:`, error);
            alert('WebSocket connection error. Please try again.');
        };

        setGameWs(socket); // เก็บ WebSocket instance ไว้ใน State เพื่อใช้ภายหลัง

        // Cleanup function สำหรับ useEffect: จะถูกเรียกเมื่อ Component unmounts
        return () => {
            // ปิด WebSocket Connection หากยังเปิดอยู่
            if (socket.readyState === WebSocket.OPEN) {
                socket.close();
            }
        };
    }, [gameId, router]); // Dependency array: Effect จะรันใหม่เมื่อ gameId หรือ router เปลี่ยน
    const myPlayerId = typeof window !== 'undefined' ? localStorage.getItem('playerId') : null;
    const myPlayerName = typeof window !== 'undefined' ? localStorage.getItem('playerName') : null;
    // Function สำหรับจัดการการลงไพ่
    const handlePlayCard = (cardValue: CardValue) => {
        // ตรวจสอบสถานะ WebSocket และสถานะเกมก่อนส่งข้อความ
        if (!gameWs || gameWs.readyState !== WebSocket.OPEN) {
            alert('Not connected to game server.');
            return;
        }
        if (!gameState || gameState.roundState !== 'Playing') {
            alert('Game is not in playing state.');
            return;
        }
        const myPlayer = gameState.players.find(p => p.id === myPlayerId); 
        if (!myPlayer || !myPlayer.hand.includes(cardValue)) {
            alert('You do not have this card.');
            return;
        }

        // ส่งข้อความ PLAY_CARD ไปยัง Server
        gameWs.send(JSON.stringify({
            type: ClientMessageType.PLAY_CARD,
            gameId: gameId,
            playerId: myPlayerId, 
            cardValue: cardValue
        }));
    };

    // Function สำหรับโฮสต์เพื่อเริ่มเกม
    const handleStartGame = async () => {
        console.log("Clicked")
        // ตรวจสอบว่าเป็นโฮสต์หรือไม่
        if (!gameState || gameState.hostId !== myPlayerId) {
            alert('Only the host can start the game.');
            return;
        }
        try {
            // ส่ง HTTP POST Request ไปยัง Backend เพื่อเริ่มเกม
            const response = await fetch(`http://localhost:5000/api/games/${gameId}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requesterId: myPlayerId })
            });
            if (!response.ok) {
                const errorData = await response.json();
                alert(`Failed to start game: ${errorData.error}`);
            }
            // Backend จะ Broadcast สถานะเกมที่เริ่มแล้วผ่าน WebSocket
        } catch (error) {
            console.error('Error starting game:', error);
            alert('Error starting game.');
        }
    };

    // Function สำหรับโฮสต์เพื่อเริ่มรอบใหม่
    const handleNextRound = async () => {
        // ตรวจสอบว่าเป็นโฮสต์หรือไม่
        if (!gameState || gameState.hostId !== myPlayerId) {
            alert('Only the host can start the next round.');
            return;
        }
        try {
            // ส่ง HTTP POST Request ไปยัง Backend เพื่อเริ่มรอบใหม่
            const response = await fetch(`http://localhost:5000/api/games/${gameId}/next-round`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requesterId: myPlayerId })
            });
            if (!response.ok) {
                const errorData = await response.json();
                alert(`Failed to start next round: ${errorData.error}`);
            }
            // Backend จะ Broadcast สถานะเกมที่เริ่มรอบใหม่แล้วผ่าน WebSocket
        } catch (error) {
            console.error('Error starting next round:', error);
            alert('Error starting next round.');
        }
    };

    // แสดงสถานะ Loading ถ้า gameState ยังเป็น null
    if (!gameState || !myPlayerId || !myPlayerName) {
        return <div style={{ padding: '20px' }}>Loading game...</div>;
    }

    // หาข้อมูลผู้เล่นคนปัจจุบันจาก gameState
    const myPlayer = gameState.players.find(p => p.id === myPlayerId);
    
    console.log("myPlayer: " ,myPlayer)
    if (!myPlayer) {
        // กรณีที่ myPlayerId มีอยู่ แต่ไม่พบใน players array ของ gameState
        // อาจจะเกิดขึ้นได้ถ้า Backend ไม่ได้เพิ่มผู้เล่นคนนี้เข้าเกม
        console.warn(`My player (${myPlayerId}) not found in game state players array.`);
        return <div style={{ padding: '20px' }}>Joining game... (Waiting for player list)</div>;
    }

    // Render UI ของหน้าห้องเกม
    return (
        <div style={{ display: 'flex', padding: '20px', fontFamily: 'Arial, sans-serif', gap: '20px', minHeight: '100vh', boxSizing: 'border-box' }}>
            {/* Game Info & Play Area */}
            <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '10px' }}>Ito Game: {gameState.name}</h1>
                <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>Game ID: <code style={{ backgroundColor: '#eee', padding: '3px 6px', borderRadius: '4px' }}>{gameId.substring(0, 8)}</code></p>

                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                    <p style={{ fontSize: '1.1em' }}>Host: <strong>{gameState.players.find(p => p.id === gameState.hostId)?.name}</strong></p>
                    <p style={{ fontSize: '1.1em' }}>Round: <strong>{gameState.currentRound}</strong> / 3</p>
                    <p style={{ fontSize: '1.2em', fontWeight: 'bold', color: gameState.teamLivesRemaining <= 1 ? 'red' : 'green' }}>
                        Team Lives: {gameState.teamLivesRemaining} ❤️
                    </p>
                </div>

                {/* UI ตามสถานะเกม */}
                {gameState.roundState === 'Lobby' && (
                    <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f0f8ff', borderRadius: '8px' }}>
                        <p style={{ fontSize: '1.1em', marginBottom: '15px' }}>Waiting for players... ({gameState.players.length}/{gameState.maxPlayers})</p>
                        <p>{gameState.hostId}, {gameState.players.find(p => p.id === gameState.hostId)?.name} {myPlayerId}</p>
                        {gameState.hostId === myPlayerId && (
                            <button
                                onClick={handleStartGame}
                                
                                style={{ padding: '10px 20px', fontSize: '1em' }}
                            >
                                Start Game ({gameState.players.length < 2 ? 'Need more players' : 'Ready'})
                            </button>
                        )}
                    </div>
                )}

                {gameState.roundState === 'Playing' && (
                    <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
                        <h2 style={{ color: '#d9534f', textAlign: 'center', marginTop: 0 }}>
                            **หัวข้อสำหรับรอบนี้:** เลข {gameState.topicCard}
                        </h2>
                        <p style={{ fontSize: '0.95em', color: '#555', textAlign: 'center', marginBottom: '20px' }}>
                            ผู้เล่นทุกคนต้อง **พูดคุยปรึกษากันในโลกภายนอก (Discord, Voice Chat)** เพื่อตกลงกันว่าตัวเลข <strong style={{ color: '#d9534f' }}>{gameState.topicCard}</strong> นี้หมายถึงอะไรในบริบทของหัวข้อ เช่น ความแรงของรถ, ขนาดสัตว์, หรือระดับความสุข
                            <br/>**ห้ามบอกตัวเลขไพ่ในมือเด็ดขาด!** ให้สื่อสารผ่านการตีความหัวข้อนี้เท่านั้น
                        </p>
                        <hr style={{ margin: '20px 0' }}/>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <p style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
                                ไพ่ที่ลงล่าสุด: <span style={{ color: '#007bff' }}>{gameState.lastPlayedCard === 0 ? 'ยังไม่มีไพ่ถูกลง' : gameState.lastPlayedCard}</span>
                            </p>
                            <p style={{ fontSize: '0.9em', color: '#888' }}>
                                (คุณต้องลงไพ่ที่สูงกว่า {gameState.lastPlayedCard})
                            </p>
                        </div>
                        {myPlayer && (
                            <div style={{ textAlign: 'center' }}>
                                <h3 style={{ marginBottom: '10px' }}>ไพ่ในมือของคุณ ({myPlayer.hand.length} ใบ):</h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
                                    {myPlayer.hand.sort((a, b) => a - b).map(card => (
                                        <button
                                            key={card}
                                            onClick={() => handlePlayCard(card)}
                                            disabled={gameState.roundState !== 'Playing' || myPlayer.hasPlayedCardThisRound} // ปิดการใช้งานปุ่มถ้าไม่ใช่ตาเล่น หรือลงไพ่ไปแล้ว
                                            style={{
                                                padding: '12px 20px',
                                                fontSize: '1.2em',
                                                backgroundColor: myPlayer.hasPlayedCardThisRound ? '#ccc' : '#007bff', // เปลี่ยนสีเมื่อลงไพ่แล้ว
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                                transition: 'transform 0.1s',
                                                cursor: myPlayer.hasPlayedCardThisRound ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {card}
                                        </button>
                                    ))}
                                </div>
                                {myPlayer.hand.length === 0 && <p style={{ color: 'green', fontWeight: 'bold' }}>คุณลงไพ่หมดมือแล้วในรอบนี้!</p>}
                            </div>
                        )}
                        <div style={{ marginTop: '20px', borderTop: '1px dashed #eee', paddingTop: '20px' }}>
                            <h3 style={{ marginBottom: '10px' }}>ไพ่ที่ถูกลงไปแล้วในรอบนี้:</h3>
                            {gameState.discardPile.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#888' }}>ยังไม่มีไพ่ถูกลง</p>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                                    {gameState.discardPile.sort((a, b) => a - b).map(card => (
                                        <span key={`discard-${card}`} style={{
                                            padding: '8px 12px',
                                            backgroundColor: '#f0f0f0',
                                            border: '1px solid #ddd',
                                            borderRadius: '5px',
                                            fontSize: '1em',
                                            color: '#555'
                                        }}>
                                            {card}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {gameState.roundState === 'RoundEnd' && (
                    <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginTop: '20px', backgroundColor: '#f0f8ff', textAlign: 'center' }}>
                        <h2 style={{ marginTop: 0 }}>Round {gameState.currentRound} Ended!</h2>
                        <p style={{ fontWeight: 'bold', fontSize: '1.1em' }}>Team Lives Remaining: {gameState.teamLivesRemaining}</p>
                        {gameState.teamLivesRemaining > 0 && gameState.currentRound < 3 ? ( // ถ้ายังมีชีวิตเหลือและยังไม่จบรอบ 3
                            gameState.hostId === myPlayerId ? ( // ถ้าเป็นโฮสต์
                                <button
                                    onClick={handleNextRound}
                                    style={{ padding: '10px 20px', fontSize: '1em', marginTop: '15px' }}
                                >
                                    Start Next Round
                                </button>
                            ) : (
                                <p style={{ color: '#555', marginTop: '15px' }}>Waiting for host to start next round...</p>
                            )
                        ) : ( // ถ้าชีวิตหมด หรือจบรอบ 3 แล้ว
                            <p style={{ color: 'red', fontWeight: 'bold', fontSize: '1.2em', marginTop: '15px' }}>
                                {gameState.teamLivesRemaining <= 0 ? "Game Over! Team ran out of lives." : "Game Over! All rounds completed."}
                            </p>
                        )}
                    </div>
                )}

                {gameState.roundState === 'GameEnd' && (
                    <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginTop: '20px', backgroundColor: '#ffe0e0', textAlign: 'center' }}>
                        <h2 style={{ color: 'red', marginTop: 0 }}>Game Over!</h2>
                        <p style={{ fontSize: '1.2em', fontWeight: 'bold', marginBottom: '20px' }}>
                            {gameState.teamLivesRemaining <= 0 ? "ทีมของคุณหมดพลังชีวิตแล้ว! 💔" : "คุณเล่นครบทุกรอบแล้ว! 🎉"}
                        </p>
                        <button onClick={() => router.push('/lobby')} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                            Back to Lobby
                        </button>
                    </div>
                )}

                <h3 style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>Players in this room:</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {gameState.players.map(player => (
                        <li key={player.id} style={{ border: '1px solid #ddd', padding: '10px', marginBottom: '8px', borderRadius: '5px', backgroundColor: player.id === myPlayerId ? '#e6ffe6' : 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>
                            <strong>{player.name}</strong> {player.id === myPlayerId && '(คุณ)'}
                            {player.id === gameState.hostId && ' (Host)'}
                            </span>
                            {gameState.roundState === 'Playing' && (
                                <span style={{ fontSize: '0.9em', color: '#666' }}>
                                    ไพ่ในมือ: {player.hand.length} ใบ
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}