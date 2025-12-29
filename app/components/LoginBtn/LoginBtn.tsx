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
import { Button, Flex, Menu, MenuButton, MenuItem, MenuList, Text } from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import { useAppSelector } from "@/app/util/hooks";

export default function LoginBtn() {
	const user = useAppSelector((state) => state.user.value);
	const [isLoading, setIsLoading] = useState(false);
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const dispatch = useAppDispatch();

	// Function to check if user is logged in by checking cookies
	const checkAuthStatus = () => {
		if (typeof document === 'undefined') return false;

		const cookies = document.cookie.split(';').reduce((acc, cookie) => {
			const [key, value] = cookie.trim().split('=');
			acc[key] = value;
			return acc;
		}, {} as Record<string, string>);

		const hasServerToken = !!cookies['server_token'];
		const hasGoogleToken = !!cookies['google_token'];
		return hasServerToken && hasGoogleToken;
	};

	useEffect(() => {
		// Check auth status on mount
		const isAuthenticated = checkAuthStatus();
		setIsLoggedIn(isAuthenticated);

		// If not authenticated but user exists in Redux, clear it
		if (!isAuthenticated && user) {
			dispatch(updateUser(null));
		}

		// Listen for storage events (in case of logout from other tabs)
		const handleStorageChange = () => {
			const authStatus = checkAuthStatus();
			setIsLoggedIn(authStatus);
			if (!authStatus && user) {
				dispatch(updateUser(null));
			}
		};

		window.addEventListener('storage', handleStorageChange);
		window.addEventListener('focus', handleStorageChange);

		return () => {
			window.removeEventListener('storage', handleStorageChange);
			window.removeEventListener('focus', handleStorageChange);
		};
	}, [user, dispatch]);

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

				// Clear cookies with proper domain and secure flags
				document.cookie = "google_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; ";
				document.cookie = "server_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; ";
				// Force clear from all paths and domains
				document.cookie.split(";").forEach(function (c) {
					document.cookie = c.trim().split("=")[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
				});

				// Store the token in a cookie
				document.cookie = `server_token=${data.token}; path=/; max-age=2592000; SameSite=Lax; Secure`;
				document.cookie = `google_token=${tokenResponse.access_token}; path=/; max-age=2592000; SameSite=Lax; Secure`;

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

	const handleLogout = async () => {
		if (!window.confirm("Are you sure you want to log out?")) return;
		try {
			// Clear cookies with proper expiration
			const pastDate = new Date(0).toUTCString();
			document.cookie = `google_token=; expires=${pastDate}; path=/`;
			document.cookie = `server_token=; expires=${pastDate}; path=/`;

			// Clear local storage if needed
			localStorage.clear();
			sessionStorage.clear();

			// Clear all cookies (including those with different paths/domains)
			document.cookie.split(";").forEach(cookie => {
				const [name] = cookie.trim().split('=');
				document.cookie = `${name}=; expires=${pastDate}; path=/; domain=${window.location.hostname}`;
			});
			// Update state
			dispatch(updateUser(null));
			setIsLoggedIn(false);

			// Force a hard refresh to ensure all states are cleared
			window.location.href = '/';
		} catch (error) {
			console.error('Logout error:', error);
		}
	};

	const handleLoginClick: MouseEventHandler<HTMLButtonElement> = () => {
		handleLogin(); // Call the Google login function
	};

	return (
		<>
			{isLoggedIn && user ? (
				<Flex alignItems="center" gap={3}>
					<Text color="white" fontSize="sm" fontWeight="medium">
						Hello, {user.name?.split(' ')[0] || 'User'}
					</Text>
					<Menu>
						<MenuButton
							as={Button}
							bg="yellow.400"
							_hover={{ bg: 'yellow.500' }}
							_active={{ bg: 'yellow.600' }}
							color="black"
							size={{ md: "md", sm: "xs" }}
							borderRadius={16}
							paddingX={4}
							paddingY={2}
						>
							<ChevronDownIcon />
						</MenuButton>
						<MenuList bg="yellow.400" borderColor="yellow.500">
							<MenuItem
								color="black"
								_hover={{ bg: 'yellow.500' }}
								onClick={handleLogout}
							>
								Logout
							</MenuItem>
						</MenuList>
					</Menu>
				</Flex>
			) : (
				<Button
					size={{ md: "md", sm: "xs" }}
					fontFamily={"arial"}
					borderRadius={16}
					margin={"auto"}
					paddingX={4}
					paddingY={2}
					rightIcon={<Image alt="Google" src={GoogleIcon} width={16} height={16} />}
					onClick={handleLoginClick}
					isLoading={isLoading}
					bg="yellow.400"
					color="black"
					_hover={{ bg: 'yellow.500' }}
					_active={{ bg: 'yellow.600' }}
				>
					Login with Google
				</Button>
			)}
		</>
	);
}