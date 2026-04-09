import { useQuery } from "@tanstack/react-query";
import { orgApi, getLocalOrgId } from "../lib/api";

export function useOrg() {
  const orgId = getLocalOrgId();

  const { data: org, isLoading } = useQuery({
    queryKey: ["org", orgId],
    queryFn: () => orgApi.get(orgId!),
    enabled: !!orgId,
  });

  return { org, orgId, isLoading, hasOrg: !!orgId && !!org };
}
