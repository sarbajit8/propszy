import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from './api';

const list = (path, params) => api.get(path, { params }).then((r) => r.data);

export function useProjects(params) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: () => list('/projects', params),
  });
}

export function useProject(idOrSlug) {
  return useQuery({
    queryKey: ['project', idOrSlug],
    queryFn: () => unwrap(api.get(`/projects/${idOrSlug}`)),
    enabled: !!idOrSlug,
  });
}

export function useProjectPins(params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));
  return useQuery({
    queryKey: ['project-pins', clean],
    queryFn: () => unwrap(api.get('/projects/map', { params: clean })),
    keepPreviousData: true,
  });
}

export function useCities() {
  return useQuery({ queryKey: ['cities'], queryFn: () => unwrap(api.get('/cities')), staleTime: 5 * 60_000 });
}

export function useFavorites(enabled = true) {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () => unwrap(api.get('/favorites')),
    enabled,
    staleTime: 30_000,
  });
}

export function useProperties(params) {
  return useQuery({
    queryKey: ['properties', params],
    queryFn: () => list('/properties', params),
  });
}

export function useProperty(id) {
  return useQuery({
    queryKey: ['property', id],
    queryFn: () => unwrap(api.get(`/properties/${id}`)),
    enabled: !!id,
  });
}

export function useAmenities() {
  return useQuery({ queryKey: ['amenities'], queryFn: () => unwrap(api.get('/amenities')) });
}

export function useHome() {
  return useQuery({
    queryKey: ['home'],
    queryFn: () => unwrap(api.get('/home')),
    staleTime: 2 * 60_000,
  });
}

export function usePosts(params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
  return useQuery({
    queryKey: ['posts', clean],
    queryFn: () => api.get('/cms/posts', { params: clean }).then((r) => r.data), // { data, meta:{categories} }
    keepPreviousData: true,
  });
}

export function usePost(slug) {
  return useQuery({
    queryKey: ['post', slug],
    queryFn: () => unwrap(api.get(`/cms/posts/${slug}`)),
    enabled: !!slug,
  });
}
