import { useAuthStore } from '../stores/authStore';
import { useRolePermissionStore, Permission } from '../stores/rolePermissionStore';

export const usePermissions = () => {
  const { user } = useAuthStore();
  const { hasPermission } = useRolePermissionStore();

  const checkPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => checkPermission(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => checkPermission(permission));
  };

  return {
    checkPermission,
    hasAnyPermission,
    hasAllPermissions,
    user
  };
};