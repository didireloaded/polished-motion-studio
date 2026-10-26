import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'NamLink — A little closer.',description:'Real connections. Right here in Namibia. A dating experience without the endless swiping.',icons:{icon:'/favicon.svg'},appleWebApp:{capable:true,title:'NamLink',statusBarStyle:'black-translucent'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
