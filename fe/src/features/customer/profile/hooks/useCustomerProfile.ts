import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { queryKeys } from "@/features/auth/queries/auth.query";
import type { Profile, User } from "@/features/auth/types/user.type";
import { customerProfileApi } from "../services/customer-profile.service";
import type { UpdateCustomerProfileInput } from "../types/customer-profile.types";

export function useUpdateCustomerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCustomerProfileInput) =>
      customerProfileApi.update(input),
    onSuccess: (response) => {
      const updateCachedUser = <T extends User>(current?: T): T | undefined =>
        current
          ? {
              ...current,
              fullName: response.user.fullName,
              phone: response.user.phone,
              avatar: response.user.avatarUrl,
              avatarUrl: response.user.avatarUrl,
            }
          : current;

      queryClient.setQueryData<Profile | undefined>(
        queryKeys.auth.profile(),
        updateCachedUser,
      );
      queryClient.setQueryData<User | undefined>(
        queryKeys.auth.me(),
        updateCachedUser,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile() });
      toast.success("Đã cập nhật hồ sơ");
    },
  });
}
