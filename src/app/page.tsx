// frontend/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PlayerSetupPage() {
    const [playerName, setPlayerName] = useState<string>('');
    const [playerId, setPlayerId] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true); // State สำหรับควบคุมการโหลดข้อมูล

    const router = useRouter();

    useEffect(() => {
        // โหลด playerId และ playerName จาก localStorage
        let storedPlayerId = localStorage.getItem('playerId');
        const storedPlayerName = localStorage.getItem('playerName');

        if (!storedPlayerId) {
            // ถ้ายังไม่มี playerId ให้สร้างขึ้นมาใหม่
            storedPlayerId = "player-" + Math.random().toString(36).substring(2, 9);
            localStorage.setItem('playerId', storedPlayerId);
        }
        setPlayerId(storedPlayerId); // กำหนด playerId เสมอ

        if (storedPlayerName) {
            // ถ้ามีชื่ออยู่แล้ว (ไม่ใช่ค่าว่าง) ให้กรอกชื่อและนำทางไปหน้า lobby ทันที
            setPlayerName(storedPlayerName);
            router.replace('/lobby'); // ใช้ replace เพื่อไม่ให้ย้อนกลับมาหน้านี้ด้วยปุ่ม back
        } else {
            // ถ้ายังไม่มีชื่อ ให้ตั้งค่าเป็นว่าง และรอให้ผู้ใช้กรอก
            setPlayerName('');
        }
        setIsLoading(false); // โหลดข้อมูลเสร็จสิ้น

    }, [router]);

    const handleSavePlayerName = () => {
        if (playerName.trim()) {
            localStorage.setItem('playerName', playerName.trim());
            router.push('/lobby'); // ไปหน้า Lobby เมื่อบันทึกชื่อสำเร็จ
        } else {
            alert('Please enter your name.');
        }
    };

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2em' }}>Loading...</div>;
    }

    return (
        <div style={{
            maxWidth: '600px',
            margin: '100px auto',
            padding: '40px',
            border: '1px solid #ddd',
            borderRadius: '12px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
            fontFamily: 'Arial, sans-serif',
            textAlign: 'center',
            backgroundColor: '#ffffff'
        }}>
            <h1 style={{ color: '#333', marginBottom: '25px', fontSize: '2.5em' }}>Welcome to Ito Game!</h1>
            <p style={{ fontSize: '1.2em', color: '#555', marginBottom: '30px' }}>
                Please enter your desired player name to get started.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Your Name"
                    style={{
                        padding: '15px',
                        fontSize: '1.2em',
                        width: '80%',
                        border: '2px solid #007bff',
                        borderRadius: '8px',
                        outline: 'none',
                        boxShadow: '0 2px 5px rgba(0,123,255,0.2)'
                    }}
                />
                <button
                    onClick={handleSavePlayerName}
                    style={{
                        padding: '15px 30px',
                        fontSize: '1.2em',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(40,167,69,0.3)',
                        transition: 'background-color 0.3s ease, transform 0.2s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#218838'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    Save Name & Enter Lobby
                </button>
            </div>
            <p style={{ fontSize: '0.9em', color: '#777', marginTop: '30px' }}>
                Your unique Player ID: <code style={{ backgroundColor: '#f0f8ff', padding: '5px 10px', borderRadius: '5px', border: '1px dashed #a0d0ff' }}>{playerId}</code>
                <br/>(This ID is saved locally on your browser and will be used to identify you in games.)
            </p>
        </div>
    );
}