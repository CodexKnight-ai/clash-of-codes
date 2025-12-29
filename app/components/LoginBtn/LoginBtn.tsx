import { Button } from "@chakra-ui/react";
import Image from "next/image";
import GoogleIcon from "../../styles/Icons/BsGoogle.svg";
import { useGoogleLogin, TokenResponse } from "@react-oauth/google";
import { MouseEventHandler } from "react";
import { useState, useEffect } from "react";
import { googleLogout } from "@react-oauth/google";
import { customFetch, getServerUrl, getUserData } from "@/app/util/functions";
import { useAppDispatch } from "@/app/util/hooks";
import { update as updateUser } from "@/app/util/userSlice";
import { UserOnClient } from "@/app/util/types";

export default function LoginBtn() {
	const [isLoading, setIsLoading] = useState(false);
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const dispatch = useAppDispatch();

	useEffect(() => {
		// Check if user is already logged in
		const checkAuth = () => {
			const hasServerToken = document.cookie.includes("server_token");
			setIsLoggedIn(hasServerToken);
		};
		checkAuth();
		window.addEventListener('focus', checkAuth);
		return () => window.removeEventListener('focus', checkAuth);
	}, []);

	const handleLogin = useGoogleLogin({
		scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
		onSuccess: async (tokenResponse) => {
			setIsLoading(true);
			try {
				// First, get user info using the access token
				const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
					headers: {
						'Authorization': `Bearer ${tokenResponse.access_token}`,
					},
				});

				if (!userInfo.ok) {
					throw new Error('Failed to fetch user info from Google');
				}

				const userData = await userInfo.json();

				// Now send the token to our backend
				const res = await customFetch('/login', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Accept': 'application/json',
					},
					body: JSON.stringify({
						token: tokenResponse.access_token,
						user: userData
					}),
					credentials: 'include',
				});

				if (!res.ok) {
					const error = await res.text();
					throw new Error(error || 'Login failed');
				}

				const data = await res.json();

				// Store the token in a cookie
				document.cookie = `server_token=${data.token}; path=/; max-age=2592000; SameSite=Lax; Secure`;

				// Update the Redux store with user data
				dispatch(updateUser(data.user));
				setIsLoggedIn(true);
			} catch (error) {
				console.error('Login error:', error);
				// Handle error (e.g., show error message to user)
			} finally {
				setIsLoading(false);
			}
		},
		onError: (error) => {
			console.error('Google login error:', error);
			setIsLoading(false);
		},
		flow: 'implicit',
	});

	const handleLogout = () => {
		googleLogout();
		document.cookie = "google_token=; expires=0; path=/";
		document.cookie = "server_token=; expires=0; path=/";
		dispatch(updateUser(null));
		setIsLoggedIn(false);
	};
	const handleLoginClick: MouseEventHandler<HTMLButtonElement> = () => {
		handleLogin(); // Call the Google login function
	};

	return (
		<Button
			size={{ md: "md", sm: "xs" }}
			fontFamily={"arial"}
			borderRadius={16}
			margin={"auto"}
			paddingX={4}
			paddingY={2}
			rightIcon={!isLoggedIn ? <Image alt="Google" src={GoogleIcon} width={16} height={16} /> : undefined}
			onClick={isLoggedIn ? handleLogout : handleLoginClick}
			isLoading={isLoading}
			variant={isLoggedIn ? "outline" : "solid"}
		>
			{isLoggedIn ? "Logout" : "Login with Google"}
		</Button>
	);
}