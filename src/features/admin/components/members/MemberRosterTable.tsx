import { ArrowDownUp, Pencil, RefreshCw, Search, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  AdminMember,
  MemberSyncStatus,
  SourceSyncStatus,
  SortKey,
  SyncSource,
} from "../../types";
import { statusText, statusVariant } from "../../utils/syncStatus";

function StatusCell({
  status,
  loading,
  onRefresh,
}: {
  status: SourceSyncStatus;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center gap-1.5">
          <Badge
            variant={statusVariant(status.state)}
            className={cn(
              "whitespace-nowrap text-[10px]",
              (status.state === "missing" || status.state === "no-id") && "text-muted-foreground",
            )}
          >
            {statusText(status.state)}
          </Badge>
          {status.actionable && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                onRefresh();
              }}
              disabled={loading}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              <span className="sr-only">Refresh {status.label}</span>
            </Button>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        <p className="font-medium">{status.label}: {statusText(status.state)}</p>
        <p className="text-xs text-muted-foreground">{status.detail}</p>
      </TooltipContent>
    </Tooltip>
  );
}

type MemberRosterTableProps = {
  members: AdminMember[];
  filteredMembers: AdminMember[];
  friendCount: number;
  memberSearch: string;
  setMemberSearch: (value: string) => void;
  syncStatuses: Record<string, MemberSyncStatus>;
  sourceRefreshing: Record<string, boolean>;
  updateSort: (key: SortKey) => void;
  onRefreshMemberSource: (member: AdminMember, source: SyncSource) => void;
  onOpenProfileEditor: (memberId: string) => void;
  onDeleteMember: (id: string, memberName: string) => void;
};

export function MemberRosterTable({
  members,
  filteredMembers,
  friendCount,
  memberSearch,
  setMemberSearch,
  syncStatuses,
  sourceRefreshing,
  updateSort,
  onRefreshMemberSource,
  onOpenProfileEditor,
  onDeleteMember,
}: MemberRosterTableProps) {
  if (members.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Members</p>
          <p className="text-xs text-muted-foreground">
            {members.length} tracked · {friendCount} friends
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Search members..."
            className="pl-8"
          />
        </div>
      </div>
      <TooltipProvider delayDuration={150}>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => updateSort("name")}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Name
                    <ArrowDownUp className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => updateSort("rank")}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Rank
                    <ArrowDownUp className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <button
                    type="button"
                    onClick={() => updateSort("lodestoneId")}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Lodestone
                    <ArrowDownUp className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="hidden lg:table-cell">Collection</TableHead>
                <TableHead className="hidden lg:table-cell">Tomestone</TableHead>
                <TableHead className="hidden lg:table-cell">FFLogs</TableHead>
                <TableHead className="hidden lg:table-cell">Lodestone</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((m) => {
                const status = syncStatuses[m.id];
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {m.avatarUrl ? (
                          <img
                            src={m.avatarUrl}
                            alt={m.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{m.name}</p>
                          <p className="font-mono text-xs text-muted-foreground md:hidden">
                            {m.id}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {m.fcRank ? (
                        <Badge variant={m.fcRank === "Friend" ? "secondary" : "outline"}>
                          {m.fcRank}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No rank</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                      {m.id}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {status ? (
                        <StatusCell
                          status={status.collection}
                          loading={Boolean(sourceRefreshing[`${m.id}:collection`])}
                          onRefresh={() => onRefreshMemberSource(m, "collection")}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">...</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {status ? (
                        <StatusCell
                          status={status.tomestone}
                          loading={Boolean(sourceRefreshing[`${m.id}:tomestone`])}
                          onRefresh={() => onRefreshMemberSource(m, "tomestone")}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">...</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {status ? (
                        <StatusCell
                          status={status.fflogs}
                          loading={Boolean(sourceRefreshing[`${m.id}:fflogs`])}
                          onRefresh={() => onRefreshMemberSource(m, "fflogs")}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">...</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {status ? (
                        <StatusCell
                          status={status.lodestone}
                          loading={Boolean(sourceRefreshing[`${m.id}:lodestone`])}
                          onRefresh={() => onRefreshMemberSource(m, "lodestone")}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">...</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenProfileEditor(m.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteMember(m.id, m.name)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredMembers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No members match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TooltipProvider>
    </div>
  );
}
