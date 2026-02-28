import { ROOMS } from '../lib/rooms';

interface RoomSelectorProps {
  activeRoom: string;
  onRoomChange: (id: string) => void;
}

export function RoomSelector({ activeRoom, onRoomChange }: RoomSelectorProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '0',
        justifyContent: 'center',
        background: '#0d0d1a',
        borderBottom: '2px solid #2a2a3a',
        padding: '8px 12px',
        flexWrap: 'wrap',
      }}
    >
      {ROOMS.map((room) => {
        const isActive = room.id === activeRoom;
        return (
          <button
            key={room.id}
            onClick={() => onRoomChange(room.id)}
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '9px',
              background: 'transparent',
              border: 'none',
              borderBottom: isActive ? '2px solid #FFD700' : '2px solid transparent',
              color: isActive ? '#FFD700' : '#666',
              cursor: 'pointer',
              padding: '6px 12px',
              letterSpacing: '0.5px',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.color = '#999';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.color = '#666';
              }
            }}
          >
            {room.icon} {room.name}
          </button>
        );
      })}
    </div>
  );
}
