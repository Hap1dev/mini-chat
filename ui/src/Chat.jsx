import React from 'react';

export default function Chat({ messages, streaming }) {
  return (
    <div
      aria-live="polite"
      style={{
        border: '1px solid #ccc',
        padding: 10,
        minHeight: 200,
        marginTop: 10,
        fontFamily: 'sans-serif'
      }}
    >
      {messages.map((m) => (
        <div
          key={m.id}
          style={{
            textAlign: m.role === 'user' ? 'right' : 'left',
            margin: '6px 0'
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: 8,
              borderRadius: 8,
              background: m.role === 'user' ? '#d1e7dd' : '#f1f1f1'
            }}
          >
            <strong style={{ fontSize: 12 }}>{m.role}</strong>
            <div>{m.text}</div>
          </div>
        </div>
      ))}

      {streaming && <div><em>typing...</em></div>}
    </div>
  );
}
