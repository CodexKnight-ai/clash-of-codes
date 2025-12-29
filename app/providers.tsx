// app/providers.tsx
"use client";

import { ChakraProvider } from "@chakra-ui/react";
import { theme } from "./styles/theme";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "./util/store";
import { GoogleAnalytics } from "nextjs-google-analytics";
export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ReduxProvider store={store}>
			{/* <GoogleAnalytics trackPageViews /> */}
			<GoogleOAuthProvider clientId="805198101040-vreklmpqqtaqpfueufs5a2hrh1fjiu6o.apps.googleusercontent.com">
				<ChakraProvider theme={theme}>{children}</ChakraProvider>
			</GoogleOAuthProvider>
		</ReduxProvider>
	);
}
