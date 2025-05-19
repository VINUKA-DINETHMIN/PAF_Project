import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import axios from 'axios';
import UserPosts from '../Profile/UserPosts';
import { getFollowers, getFollowing } from '../services/api';
import './Profile.css';

const Profile = () => {
    const { userId } = useParams();
    const { user: currentUser } = useRequireAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [error, setError] = useState('');
    const [showFollowers, setShowFollowers] = useState(false);
    const [showFollowing, setShowFollowing] = useState(false);
    const [followersList, setFollowersList] = useState([]);
    const [followingList, setFollowingList] = useState([]);
    const [loadingList, setLoadingList] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // If no userId is provided, use the current user's ID
                const targetUserId = userId || (currentUser && (currentUser.id || currentUser.sub));
                
                if (!targetUserId) {
                    setError('No user ID available');
                    return;
                }

                const response = await axios.get(`http://localhost:8081/api/users/${targetUserId}`, {
                    withCredentials: true
                });
                setProfile(response.data);
                
                // Check if current user is following this profile
                if (currentUser && targetUserId !== currentUser.id) {
                    const currentUserId = currentUser.id || currentUser.sub;
                    if (currentUserId) {
                        const followResponse = await axios.get(
                            `http://localhost:8081/api/users/${currentUserId}/following/${targetUserId}`,
                            { withCredentials: true }
                        );
                        setIsFollowing(followResponse.data);
                    }
                }
            } catch (error) {
                setError('Failed to fetch profile');
                console.error('Error fetching profile:', error);
            }
        };

        if (currentUser) {
            fetchProfile();
        } else {
            navigate('/login');
        }
    }, [userId, currentUser, navigate]);

    const handleFollow = async () => {
        try {
            if (!currentUser) {
                setError('You must be logged in to follow users');
                return;
            }

            const currentUserId = currentUser.id || currentUser.sub;
            if (!currentUserId) {
                setError('Unable to determine user ID. Please log in again.');
                return;
            }

            const targetUserId = userId || currentUserId;

            if (isFollowing) {
                await axios.post(
                    `http://localhost:8081/api/users/${targetUserId}/unfollow`,
                    null,
                    {
                        params: { followerId: currentUserId },
                        withCredentials: true
                    }
                );
            } else {
                await axios.post(
                    `http://localhost:8081/api/users/${targetUserId}/follow`,
                    null,
                    {
                        params: { followerId: currentUserId },
                        withCredentials: true
                    }
                );
            }
            
            // Refresh profile data
            const response = await axios.get(`http://localhost:8081/api/users/${targetUserId}`, {
                withCredentials: true
            });
            setProfile(response.data);
            setIsFollowing(!isFollowing);
        } catch (error) {
            setError('Failed to update follow status: ' + (error.response?.data?.message || error.message));
            console.error('Error updating follow status:', error);
        }
    };

    const handleShowFollowers = async () => {
        setLoadingList(true);
        setShowFollowers(true);
        try {
            const followers = await getFollowers(targetUserId);
            setFollowersList(followers);
        } finally {
            setLoadingList(false);
        }
    };

    const handleShowFollowing = async () => {
        setLoadingList(true);
        setShowFollowing(true);
        try {
            const following = await getFollowing(targetUserId);
            setFollowingList(following);
        } finally {
            setLoadingList(false);
        }
    };

    const closeModal = () => {
        setShowFollowers(false);
        setShowFollowing(false);
    };

    if (!profile) {
        return <div className="loading">Loading...</div>;
    }

    // Get the current user's ID, handling both OAuth and manual login cases
    const currentUserId = currentUser?.id || currentUser?.sub;
    const targetUserId = userId || currentUserId;
    const isOwnProfile = currentUserId && parseInt(currentUserId) === parseInt(targetUserId);

    return (
        <div className="profile-container">
            <div className="profile-header">
                <img 
                    src={profile.profileImage || '/default-avatar.png'} 
                    alt={profile.name} 
                    className="profile-image"
                />
                <h1 className="profile-name">{profile.name}</h1>
                <p className="profile-email">{profile.email}</p>
                
                {currentUser && !isOwnProfile && (
                    <button 
                        className={`follow-button ${isFollowing ? 'following' : ''}`}
                        onClick={handleFollow}
                    >
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>
                )}
            </div>
            
            <div className="profile-stats">
                <div className="stat-item" style={{cursor:'pointer'}} onClick={handleShowFollowers}>
                    <span className="stat-value">{profile.followersCount || 0}</span>
                    <span className="stat-label">Followers</span>
                </div>
                <div className="stat-item" style={{cursor:'pointer'}} onClick={handleShowFollowing}>
                    <span className="stat-value">{profile.followingCount || 0}</span>
                    <span className="stat-label">Following</span>
                </div>
            </div>

            {showFollowers && (
                <div className="modal-overlay" onClick={closeModal}>
                  <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <h2>Followers</h2>
                    {loadingList ? <p>Loading...</p> : (
                      followersList.length === 0 ? <p>No followers found.</p> :
                      <ul>
                        {followersList.map(user => (
                          <li key={user.id} style={{marginBottom:'10px'}}>
                            <img src={user.profileImage || '/default-avatar.png'} alt={user.name} style={{width:32,height:32,borderRadius:'50%',marginRight:8}} />
                            {user.name} <span style={{color:'#888',fontSize:'0.9em'}}>{user.email}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button onClick={closeModal} style={{marginTop:16}}>Close</button>
                  </div>
                </div>
            )}
            {showFollowing && (
                <div className="modal-overlay" onClick={closeModal}>
                  <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <h2>Following</h2>
                    {loadingList ? <p>Loading...</p> : (
                      followingList.length === 0 ? <p>Not following anyone.</p> :
                      <ul>
                        {followingList.map(user => (
                          <li key={user.id} style={{marginBottom:'10px'}}>
                            <img src={user.profileImage || '/default-avatar.png'} alt={user.name} style={{width:32,height:32,borderRadius:'50%',marginRight:8}} />
                            {user.name} <span style={{color:'#888',fontSize:'0.9em'}}>{user.email}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button onClick={closeModal} style={{marginTop:16}}>Close</button>
                  </div>
                </div>
            )}

            {error && <div className="error-message">{error}</div>}

            {/* Show UserPosts component */}
            <UserPosts userId={targetUserId} />
        </div>
    );
};

export default Profile;