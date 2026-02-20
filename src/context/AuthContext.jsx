import { createContext, useContext, useEffect, useState } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendEmailVerification
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Signup Function
    const signup = async (email, password, role, fullName) => {
        // 1. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Send Email Verification
        // 2. Send Email Verification (DISABLED - Using Custom OTP)
        // await sendEmailVerification(user);

        // 3. Create Firestore Profile
        const profileData = {
            uid: user.uid,
            email: user.email,
            fullName,
            role, // 'student', 'university_manager', 'admin'
            createdAt: new Date().toISOString(),
            // Initial Status
            status: role === 'university_manager' ? 'pending_details' : 'active',
            profileCompleted: role !== 'university_manager',
            emailVerified: false // Track manually if needed, or rely on auth.user.emailVerified
        };

        await setDoc(doc(db, 'users', user.uid), profileData);
        setUserProfile(profileData);
        return user;
    };

    // Login Function
    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    // Logout Function
    const logout = () => {
        setUserProfile(null);
        return signOut(auth);
    };

    // Update Manager Details
    const submitManagerDetails = async (uid, details) => {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
            ...details,
            status: 'pending_approval'
        });
        // Refresh profile locally
        setUserProfile(prev => ({ ...prev, ...details, status: 'pending_approval' }));
    };

    // Resend Verification
    const resendVerificationEmail = (user) => {
        return sendEmailVerification(user);
    };

    // Generic Update Profile (Student/User)
    const updateUserProfile = async (uid, data) => {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, data);
        setUserProfile(prev => ({ ...prev, ...data }));
    };

    // Upload Profile Image (Mock Implementation due to placeholder keys)
    // In real app: uploadBytes(ref(storage, path), file) -> getDownloadURL
    const uploadProfileImage = async (uid, file) => {
        // Mock Upload: Just return a local object URL or fake URL
        // Real code would be:
        // const storageRef = ref(storage, `profile_images/${uid}`);
        // await uploadBytes(storageRef, file);
        // return await getDownloadURL(storageRef);

        console.log("Mock Uploading file to Storage:", file.name);
        return URL.createObjectURL(file); // Return local preview as "url"
    };

    // Monitor Auth State & Profile
    useEffect(() => {
        let profileUnsub;

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            setLoading(true); // Temporarily loading while fetching profile

            if (user) {
                // Real-time listener for User Profile
                try {
                    const docRef = doc(db, 'users', user.uid);
                    profileUnsub = onSnapshot(docRef, (docSnap) => {
                        if (docSnap.exists()) {
                            setUserProfile(docSnap.data());
                        } else {
                            console.log("No such user profile!");
                            setUserProfile(null);
                        }
                        setLoading(false);
                    }, (error) => {
                        console.error("Error listening to profile:", error);
                        setLoading(false);
                    });
                } catch (error) {
                    console.error("Error setting up profile listener:", error);
                    setLoading(false);
                }
            } else {
                setUserProfile(null);
                setLoading(false);
                if (profileUnsub) profileUnsub();
            }
        });

        return () => {
            unsubscribe();
            if (profileUnsub) profileUnsub();
        };
    }, []);

    const value = {
        currentUser,
        userProfile,
        signup,
        login,
        logout,
        submitManagerDetails,
        updateUserProfile,
        uploadProfileImage,
        resendVerificationEmail,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
