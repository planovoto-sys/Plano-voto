import { useContext } from 'react';
import { UserContext } from '@/app/providers/UserContext';

export const useUser = () => useContext(UserContext);
