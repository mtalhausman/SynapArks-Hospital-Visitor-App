/**
 * SynapArk Auth & Session Types
 */

export interface UserPrincipal {
  id: string;
  displayName: string;
  email: string;
  username?: string;
  roles: string[];
  permissions?: string[];
  organizationId?: string;
}

export type AdminRole = "l1" | "l2" | "admin";
