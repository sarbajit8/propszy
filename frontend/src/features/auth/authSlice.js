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

export const requestOtp = createAsyncThunk('auth/requestOtp', async (phone, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/otp/request', { phone });
    return data.data;
  } catch (e) {
    return rejectWithValue(apiError(e));
  }
});

export const verifyOtp = createAsyncThunk('auth/verifyOtp', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/otp/verify', payload);
    setAccessToken(data.data.accessToken);
    return data.data.user;
  } catch (e) {
    return rejectWithValue(apiError(e));
  }
});

export const requestStaffOtp = createAsyncThunk('auth/requestStaffOtp', async (phone, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/staff/otp/request', { phone });
    return data.data;
  } catch (e) {
    return rejectWithValue(apiError(e));
  }
});

export const verifyStaffOtp = createAsyncThunk('auth/verifyStaffOtp', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/staff/otp/verify', payload);
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

// Call this to sync the latest role/kycStatus from the server into the store
// (needed after admin approval so the associate's session reflects the change)
export const refreshMe = createAsyncThunk('auth/refreshMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    return data.data.user ?? data.data;
  } catch (e) {
    return rejectWithValue(apiError(e));
  }
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
    b.addCase(verifyOtp.fulfilled, (s, a) => { s.user = a.payload; });
    b.addCase(verifyStaffOtp.fulfilled, (s, a) => { s.user = a.payload; });
    b.addCase(logout.fulfilled, (s) => { s.user = null; });
    b.addCase(refreshMe.fulfilled, (s, a) => { if (a.payload) s.user = a.payload; });
  },
});

export const { setUser } = slice.actions;
export default slice.reducer;

export const selectUser = (s) => s.auth.user;
export const selectAuthReady = (s) => s.auth.ready;
