'use client';

import { use } from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import io from 'socket.io-client';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Users, Copy
} from 'lucide-react';

const SIGNALING_SERVER_URL =
  process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL || 'http://localhost:4000';
const STUN_SERVERS = process.env.NEXT_PUBLIC_STUN_SERVERS
  ? JSON.parse(process.env.NEXT_PUBLIC_STUN_SERVERS)
  : [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ];

let socket;
const peers = {};

export default function MeetingRoomPage({ params }) {
  const { meetingId } = use(params); // ✅ Unwrap params Promise
  const router = useRouter();
  const { data: session, status } = useSession();

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [meetingDetails, setMeetingDetails] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [error, setError] = useState(null);

  const userId = session?.user?.id;
  const userName = session?.user?.name || 'Guest';

  const createPeerConnection = useCallback((remoteUserId) => {
    const peerConnection = new RTCPeerConnection({ iceServers: STUN_SERVERS });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current);
      });
    }

    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => ({ ...prev, [remoteUserId]: remoteStream }));
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', remoteUserId, event.candidate);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log(`Peer connection state for ${remoteUserId}:`, peerConnection.connectionState);
    };

    return peerConnection;
  }, []);

  useEffect(() => {
    if (status === 'loading' || !meetingId || !userId) return;

    const fetchMeetingDetails = async () => {
      try {
        const response = await fetch(`/api/meetings/${meetingId}`);
        const data = await response.json();
        if (data.success) {
          setMeetingDetails(data.data);
        } else {
          setError(data.message);
          router.push('/');
        }
      } catch (err) {
        setError('Failed to load meeting details.');
        router.push('/');
      }
    };

    fetchMeetingDetails();

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        localStreamRef.current = stream;

        socket = io(SIGNALING_SERVER_URL);

        socket.on('connect', () => {
          socket.emit('join-room', meetingId, userId);
        });

        socket.on('user-connected', async (newUserId) => {
          const peerConnection = createPeerConnection(newUserId);
          peers[newUserId] = peerConnection;
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          socket.emit('offer', newUserId, offer);
        });

        socket.on('offer', async (fromUserId, offer) => {
          const peerConnection = createPeerConnection(fromUserId);
          peers[fromUserId] = peerConnection;
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.emit('answer', fromUserId, answer);
        });

        socket.on('answer', async (fromUserId, answer) => {
          const peerConnection = peers[fromUserId];
          if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          }
        });

        socket.on('ice-candidate', async (fromUserId, candidate) => {
          const peerConnection = peers[fromUserId];
          if (peerConnection && candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          }
        });

        socket.on('user-disconnected', (disconnectedUserId) => {
          setRemoteStreams(prev => {
            const newState = { ...prev };
            delete newState[disconnectedUserId];
            return newState;
          });
          if (peers[disconnectedUserId]) {
            peers[disconnectedUserId].close();
            delete peers[disconnectedUserId];
          }
        });

        socket.on('chat-message', (message) => {
          setChatMessages(prev => [...prev, message]);
        });

      })
      .catch(err => {
        setError('Please allow camera and microphone access.');
      });

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (socket) {
        socket.disconnect();
      }
      for (const peerId in peers) {
        if (peers[peerId]) {
          peers[peerId].close();
          delete peers[peerId];
        }
      }
    };
  }, [meetingId, userId, status, createPeerConnection, router]);

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        setIsMicMuted(!track.enabled);
      });
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
        setIsCameraOff(!track.enabled);
      });
    }
  };

  const endCall = () => {
    router.push('/');
  };

  const sendChatMessage = (e) => {
    e.preventDefault();
    if (newChatMessage.trim() && socket) {
      const message = {
        senderId: userId,
        senderName: userName,
        text: newChatMessage.trim(),
        timestamp: new Date().toISOString(),
      };
      socket.emit('chat-message', meetingId, message);
      setChatMessages(prev => [...prev, message]);
      setNewChatMessage('');
    }
  };

  const copyMeetingLink = () => {
    const meetingLink = `${window.location.origin}/meeting/${meetingId}`;
    navigator.clipboard?.writeText(meetingLink)
      .then(() => alert('Meeting link copied!'))
      .catch(() => alert('Failed to copy link.'));
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading meeting...</div>;
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-red-800 text-white p-4">{error}</div>;
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white relative">
      <div className="flex-1 flex flex-wrap gap-4 p-4 justify-center items-center overflow-auto pb-24">
        <div className="relative bg-black rounded-lg overflow-hidden shadow-lg flex-shrink-0"
          style={{ width: 'min(100%, 400px)', height: 'min(100%, 300px)' }}>
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover rounded-lg transform scale-x-[-1]"></video>
          <div className="absolute bottom-2 left-2 bg-gray-800 bg-opacity-75 text-xs px-2 py-1 rounded-md">You ({userName})</div>
        </div>

        {Object.entries(remoteStreams).map(([remoteUserId, stream]) => (
          <div key={remoteUserId} className="relative bg-black rounded-lg overflow-hidden shadow-lg flex-shrink-0"
            style={{ width: 'min(100%, 400px)', height: 'min(100%, 300px)' }}>
            <video ref={video => { if (video) video.srcObject = stream; }} autoPlay playsInline className="w-full h-full object-cover rounded-lg"></video>
            <div className="absolute bottom-2 left-2 bg-gray-800 bg-opacity-75 text-xs px-2 py-1 rounded-md">User {remoteUserId.substring(0, 8)}...</div>
          </div>
        ))}

        {Object.keys(remoteStreams).length === 0 && (
          <p className="text-gray-400 text-lg">Waiting for others to join...</p>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-800 bg-opacity-90 flex justify-center items-center gap-6 rounded-t-xl shadow-lg z-10">
        <button onClick={toggleMic} className="p-3 bg-gray-700 rounded-full hover:bg-gray-600">
          {isMicMuted ? <MicOff className="text-red-400" size={24} /> : <Mic className="text-green-400" size={24} />}
        </button>
        <button onClick={toggleCamera} className="p-3 bg-gray-700 rounded-full hover:bg-gray-600">
          {isCameraOff ? <VideoOff className="text-red-400" size={24} /> : <Video className="text-blue-400" size={24} />}
        </button>
        <button onClick={endCall} className="p-3 bg-red-600 rounded-full hover:bg-red-700">
          <PhoneOff className="text-white" size={24} />
        </button>
        <button onClick={copyMeetingLink} className="p-3 bg-purple-600 rounded-full hover:bg-purple-700 hidden md:block">
          <Copy className="text-white" size={24} />
        </button>
        <button onClick={() => setShowChat(!showChat)} className="p-3 bg-gray-700 rounded-full hover:bg-gray-600">
          <MessageSquare className="text-white" size={24} />
        </button>
        <button onClick={() => setShowParticipants(!showParticipants)} className="p-3 bg-gray-700 rounded-full hover:bg-gray-600">
          <Users className="text-white" size={24} />
        </button>
      </div>

      {(showChat || showParticipants) && (
        <div className={`fixed inset-y-0 right-0 w-80 bg-gray-800 shadow-xl flex flex-col z-20 transform ${showChat || showParticipants ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300`}>
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold">{showChat ? 'Chat' : 'Participants'}</h2>
            <button onClick={() => { setShowChat(false); setShowParticipants(false); }} className="text-gray-400 hover:text-white">✕</button>
          </div>

          {showChat && (
            <div className="flex-1 flex flex-col p-4 overflow-y-auto">
              <div className="flex-1 space-y-4 mb-4">
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.senderId === userId ? 'justify-end' : 'justify-start'}`}>
                    <div className={`${msg.senderId === userId ? 'bg-blue-600' : 'bg-gray-700'} rounded-lg p-3 max-w-[80%]`}>
                      <p className="text-xs font-semibold text-gray-300 mb-1">{msg.senderName}</p>
                      <p className="text-sm">{msg.text}</p>
                      <p className="text-xs text-gray-400 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendChatMessage} className="flex gap-2 mt-auto pt-4 border-t border-gray-700">
                <input
                  type="text"
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-2 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" className="p-2 bg-blue-600 rounded-md hover:bg-blue-700">Send</button>
              </form>
            </div>
          )}

          {showParticipants && (
            <div className="flex-1 p-4 overflow-y-auto">
              <h3 className="text-lg font-medium mb-4">In this call ({meetingDetails?.participants?.length || 0})</h3>
              <ul className="space-y-2">
                {meetingDetails?.participants?.map(participant => (
                  <li key={participant._id} className="flex items-center gap-3 p-2 bg-gray-700 rounded-md">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
                      {participant.name ? participant.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span>{participant.name || 'Unknown User'} {participant._id === userId ? '(You)' : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
