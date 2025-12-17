import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/authSlice';
import orgsReducer from '@/store/orgsSlice';
import personalityReducer from '@/store/personalitySlice';
import reviewSlice from '@/store/reviewSlice';
import  profileSlice  from '@/store/profileSlice';


export const store = configureStore({
  reducer: {
    auth: authReducer,
    orgs: orgsReducer,
    personalities: personalityReducer,
    reviews: reviewSlice,
    profile: profileSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
