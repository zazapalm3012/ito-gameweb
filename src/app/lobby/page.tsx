// frontend/app/lobby/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LobbyPage() {
    // ลบ gameIdInput และ setGameIdInput ออก เพราะไม่มีการใช้งานแล้ว
    const [newGameNameInput, setNewGameNameInput] = useState('');
    const [lobbyGames, setLobbyGames] = useState<any[]>([]);

    const [playerName, setPlayerName] = useState<string>(''); // เก็บ playerName เพื่อแสดงผลและใช้ในการสร้าง/เข้าร่วมเกม
    const [playerId, setPlayerId] = useState<string>(''); // เก็บ playerId
    const [isLoadingPlayerInfo, setIsLoadingPlayerInfo] = useState<boolean>(true); // เพิ่ม State สำหรับการโหลดข้อมูลผู้เล่น

    const router = useRouter();

    // Effect สำหรับโหลด Player Info จาก localStorage และตรวจสอบ
    useEffect(() => {
        const storedPlayerId = localStorage.getItem('playerId');
        const storedPlayerName = localStorage.getItem('playerName');

        if (!storedPlayerId || !storedPlayerName || storedPlayerName.trim() === '') {
            // ถ้าไม่มี playerId หรือ playerName หรือชื่อว่างเปล่า ให้ Redirect กลับไปหน้า PlayerSetup (หน้า root)
            alert('Your player name is missing or empty. Please set it before entering the lobby.'); // แจ้งเตือนผู้ใช้
            router.replace('/'); // redirect ไปที่หน้า root (PlayerSetupPage)
            return; // หยุดการทำงานของ useEffect นี้
        }

        setPlayerId(storedPlayerId);
        setPlayerName(storedPlayerName);
        setIsLoadingPlayerInfo(false); // โหลดข้อมูลผู้เล่นเสร็จแล้ว

        // ดึงรายการเกมจาก Backend
        fetchGames();
        const interval = setInterval(fetchGames, 5000); // อัปเดตทุก 5 วินาที
        return () => clearInterval(interval);
    }, [router]); // dependency array

    // Function สำหรับบันทึกชื่อผู้เล่น (ยังคงมีเผื่อผู้ใช้ต้องการเปลี่ยนชื่อทีหลังใน Lobby)
    const handleUpdatePlayerName = () => {
        if (playerName.trim()) {
            localStorage.setItem('playerName', playerName.trim());
            alert('Your name has been updated!');
        } else {
            alert('Player name cannot be empty. Please enter your name.');
            // ถ้าผู้ใช้ลบชื่อทิ้งจนว่างเปล่าในหน้านี้ อาจจะบังคับกลับไปหน้าแรกอีกครั้ง
            router.replace('/');
        }
    };

    const fetchGames = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/games');
            if (response.ok) {
                const data = await response.json();
                setLobbyGames(data);
            } else {
                console.error('Failed to fetch lobby games');
            }
        } catch (error) {
            console.error('Error fetching lobby games:', error);
        }
    };

    const handleCreateGame = async () => {
        if (!newGameNameInput.trim()) {
            alert('Please enter a game name.');
            return;
        }
        // ไม่ต้องเช็ค playerName.trim() ซ้ำที่นี่แล้ว เพราะถูกเช็คและ redirect ไปแล้วตอนต้น useEffect
        // และ playerId/playerName ถูกโหลดเข้า state แล้ว

        try {
            const response = await fetch('http://localhost:5000/api/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameName: newGameNameInput.trim(),
                    hostId: playerId, // ส่ง playerId ที่ได้จาก localStorage
                    hostName: playerName.trim() // ส่ง playerName ที่ได้จาก localStorage
                })
            });
            if (response.ok) {
                const newGame = await response.json();
                // ตรวจสอบว่า Backend ส่ง gameId มาจริงๆ
                if (newGame.id) {
                    router.push(`/game/${newGame.id}`);
                } else {
                    alert('Error: Game ID not received from server after creating game.');
                    console.error('Backend did not return gameId:', newGame);
                }
            } else {
                const errorData = await response.json();
                alert(`Failed to create game: ${errorData.error}`);
            }
        } catch (error) {
            console.error('Error creating game:', error);
            alert('Error creating game.');
        }
    };

    const handleJoinGame = async (gameId: string) => {
        // Ensure player name is set (though this should be handled by the root page now)
        const myPlayerId = localStorage.getItem('playerId'); // Use 'playerId' as per your localStorage keys
        const myPlayerName = localStorage.getItem('playerName'); // Use 'playerName' as per your localStorage keys

        if (!myPlayerId || !myPlayerName || myPlayerName.trim() === '') {
            alert('Your player name is missing or empty. Please set it before joining a game.');
            router.replace('/'); // Redirect to the name setup page
            return;
        }

        // --- THIS IS THE CRITICAL HTTP CALL ---
        try {
            console.log(`[Frontend Lobby] Attempting to join game ${gameId} via HTTP POST.`);
            const response = await fetch(`http://localhost:5000/api/games/${gameId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId: myPlayerId,
                    playerName: myPlayerName.trim()
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`[Frontend Lobby] Successfully joined game ${gameId} via HTTP. Response:`, data);
                router.push(`/game/${gameId}`); // Only navigate AFTER successful HTTP join
            } else {
                const errorData = await response.json();
                alert(`Failed to join game: ${errorData.error || 'Unknown error'}`);
                console.error(`[Frontend Lobby] Failed to join game via HTTP:`, errorData);
            }
        } catch (error) {
            console.error(`[Frontend Lobby] Network error or unexpected error during HTTP join:`, error);
            alert('An error occurred while trying to join the game. Please try again.');
        }
    };

    const handleQuickJoin = () => {
        if (lobbyGames.length > 0) {
            handleJoinGame(lobbyGames[0].id); // ใช้ game.id จาก lobbyGames[0]
        } else {
            alert('No games available to quick join. Create a new one!');
        }
    };

    // แสดงหน้าโหลดจนกว่าจะโหลดข้อมูลผู้เล่นเสร็จ
    if (isLoadingPlayerInfo) {
        return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2em' }}>Loading lobby...</div>;
    }

    // UI Lobby ปกติ (จะแสดงเมื่อมีชื่อผู้เล่นแล้ว)
    return (
        <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ textAlign: 'center', color: '#333' }}>Ito Game Lobby</h1>

            {/* ส่วนสำหรับ Player Info (สามารถแก้ไขชื่อได้) */}
            <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #a0c0ff', borderRadius: '8px', backgroundColor: '#e6f0ff' }}>
                <h2 style={{ fontSize: '1.4em', marginTop: '0', color: '#3366cc' }}>Your Player Info</h2>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <label htmlFor="playerName" style={{ marginRight: '10px', fontWeight: 'bold' }}>Your Name:</label>
                    <input
                        id="playerName"
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Enter your name"
                        style={{ flexGrow: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                    <button onClick={handleUpdatePlayerName} style={{ marginLeft: '10px', padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                        Update Name
                    </button>
                </div>
                <p style={{ fontSize: '0.9em', color: '#555' }}>
                    Your Player ID: <code style={{ backgroundColor: '#ddeeff', padding: '2px 6px', borderRadius: '3px' }}>{playerId}</code>
                    (This ID is saved on your browser)
                </p>
            </div>

            <h2 style={{ fontSize: '1.5em', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px', color: '#555' }}>Create New Game</h2>
            <div style={{ marginBottom: '30px' }}>
                <input
                    type="text"
                    value={newGameNameInput}
                    onChange={(e) => setNewGameNameInput(e.target.value)}
                    placeholder="Enter new game name"
                    style={{ padding: '10px', marginRight: '10px', width: '60%', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <button
                    onClick={handleCreateGame}
                    style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                >
                    Create Game
                </button>
            </div>

            <h2 style={{ fontSize: '1.5em', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px', color: '#555' }}>Join Existing Game</h2>
            <div style={{ marginBottom: '20px' }}>
                {lobbyGames.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#777' }}>No active games. Create one!</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {lobbyGames.map((game) => (
                            <li key={game.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed #eee' }}>
                                <span>
                                    <strong>{game.name}</strong> (Players: {game.currentPlayers}/{game.maxPlayers})
                                </span>
                                <button
                                    onClick={() => handleJoinGame(game.id)}
                                    disabled={game.currentPlayers >= game.maxPlayers}
                                    style={{ padding: '8px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                                >
                                    Join
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <button
                    onClick={handleQuickJoin}
                    disabled={lobbyGames.length === 0}
                    style={{ padding: '12px 25px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1.1em' }}
                >
                    Quick Join First Available Game
                </button>
            </div>
        </div>
    );
}