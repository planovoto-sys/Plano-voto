import { useContext } from 'react';
import { UserContext } from './UserContextCore';

export const useUser = () => useContext(UserContext);
