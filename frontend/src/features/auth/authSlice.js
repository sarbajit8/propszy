import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api, setAccessToken, apiError } from '../../lib/api';

// Restore session on app load (refresh cookie -> access token + user)
export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async () => {
  const { data } = await api.post('/auth/refresh');
  setAccessToken(data.data.accessToken);
  return data.data.user;
});

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', payload);
    setAccessToken(data.data.accessToken);
    return data.data.user;
  } catch (e) {
    return rejectWithValue(apiError(e));
  }
});

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', payload);
    setAccessToken(data.data.accessToken);
    return data.data.user;
  } catch (e) {
    return rejectWithValue(apiError(e));
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await api.post('/auth/logout');
  setAccessToken(null);
});

const slice = createSlice({
  name: 'auth',
  initialState: { user: null, status: 'idle', ready: false },
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
    },
  },
  extraReducers: (b) => {
    b.addCase(bootstrapAuth.fulfilled, (s, a) => { s.user = a.payload; s.ready = true; });
    b.addCase(bootstrapAuth.rejected, (s) => { s.user = null; s.ready = true; });
    b.addCase(login.fulfilled, (s, a) => { s.user = a.payload; });
    b.addCase(register.fulfilled, (s, a) => { s.user = a.payload; });
    b.addCase(logout.fulfilled, (s) => { s.user = null; });
  },
});

export const { setUser } = slice.actions;
export default slice.reducer;

export const selectUser = (s) => s.auth.user;
export const selectAuthReady = (s) => s.auth.ready;
