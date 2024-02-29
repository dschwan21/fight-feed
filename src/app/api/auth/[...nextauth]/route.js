import NextAuth from 'next-auth';
import {options} from './options.js'

const handler = NextAuth(options)

export {handler as GET, handler as POST}