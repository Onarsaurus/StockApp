import { useColorScheme } from '@/app-example/hooks/useColorScheme';
import App from '@/components/app';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';

export default function RootLayout() {

  const colorScheme = useColorScheme();

  return (

    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
    
    <App/>
    
    </ThemeProvider>
    
    );
}
