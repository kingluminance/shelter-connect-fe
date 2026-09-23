// docs/auth-and-permissions.md (B-04)
export interface ServiceUserProfile {
  id: string;
  displayName: string;
  role: 'USER' | 'OPERATOR';
}
