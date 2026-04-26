import React, { createContext, useContext, useState, useEffect } from "react";
import * as api from "../services/api"; // adjust path

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
	const [currentUser, setCurrentUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// On mount, try to restore user from token
	useEffect(() => {
		const loadUser = async () => {
			const token = localStorage.getItem("kk_token");
			if (!token) {
				setLoading(false);
				return;
			}
			try {
				const { data:profileData } = await api.getProfile();
				setCurrentUser(profileData.user);
			} catch (err) {
				console.error("Failed to load user", err);
				localStorage.removeItem("kk_token");
			} finally {
				setLoading(false);
			}
		};
		loadUser();
	}, []);

	const login = async (email, password, role) => {
		setError(null);
		try {
			const { data } = await api.login({ email, password, role }); 
			localStorage.setItem("kk_token", data.token);
			const { data: profileData } = await api.getProfile();
			setCurrentUser(profileData.user);
			console.log("Login successful, user profile loaded:", profileData);
			return { success: true };
		} catch (err) {
			const message = err.response?.data?.message || "Login failed";
			setError(message);
			return { success: false, error: message };
		}
	};

	const register = async (name, email, password, role, address, phone) => {
		setError(null);
		try {
			const { data } = await api.signup({
				name,
				email,
				password,
				role,
				address,
				phone,
			});
			localStorage.setItem("kk_token", data.token);
			const { data: profileData } = await api.getProfile();
			setCurrentUser(profileData.user);
			return { success: true };
		} catch (err) {
			const message =
				err.response?.data?.message || "Registration failed something went wrong";
			setError(message);
			return { success: false, error: message };
		}
	};

	const updateProfile = async (profileData) => {
		setError(null);
		try {
			const { data } = await api.updateProfile(profileData);
			setCurrentUser((prev) => ({ ...prev, ...data.user }));
			return { success: true }; 
		} catch (err) {
			const message = err.response?.data?.message || "Update failed";
			setError(message);
			return { success: false, error: message };
		}
	};

	const changePassword = async (oldPassword, newPassword) => {
		setError(null);
		try {
			await api.changePassword({ oldPassword, newPassword });
			return { success: true };
		} catch (err) {
			console.log("Password change error:", err.response?.data?.message);
			const message = err.response?.data?.message || "Password change failed";
			setError(message);
			return { success: false, error: message };
		}
	};

	const logout = () => {
		localStorage.removeItem("kk_token");
		setCurrentUser(null);
	};

	const value = {
		currentUser,
		loading,
		error,
		login,
		register,
		updateProfile,
		changePassword,
		logout,
		role: currentUser?.role,
		userName: currentUser?.name,
		userId: currentUser?._id,
		userEmail: currentUser?.email,
		userAddress: currentUser?.address,
		userPhone: currentUser?.phone,
		userPhoto: currentUser?.photo,
		avgRating: currentUser?.avgRating || 0,
		numRatings: currentUser?.numRatings || 0,
	};

	return (
		<AuthContext.Provider value={value}>{children}</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
};
