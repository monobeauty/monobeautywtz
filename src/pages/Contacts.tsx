import { useState, useMemo } from "react";
import { useMessages } from "@/hooks/useMessages";
import { useChatStatus } from "@/hooks/useChatStatus";
import { InstanceSidebar } from "@/components/InstanceSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Phone, MessageSquare, Clock } from "lucide-react";
import { format } from "date-fns";

const Contacts = () => {
  const { messages, instances } = useMessages();
  const { getStatus } = useChatStatus();
  const [search, setSearch] = useState("");

  const contacts = useMemo(() => {
    const map = new Map<string, {
      jid: string;
      pushName: string;
      lastMessage: string;
      lastTimestamp: string;
      totalMessages: number;
      instances: Set<string>;
    }>();

    messages.forEach((msg) => {
      const existing = map.get(msg.remote_jid);
      if (!existing) {
        map.set(msg.remote_jid, {
          jid: msg.remote_jid,
          pushName: (!msg.is_from_me && msg.push_name) ? msg.push_name : msg.remote_jid.replace(/@.*/, ""),
          lastMessage: msg.message_text || "[mídia]",
          lastTimestamp: msg.created_at,
          totalMessages: 1,
          instances: new Set([msg.instance_name]),
        });
      } else {
        existing.totalMessages++;
        existing.instances.add(msg.instance_name);
        if (!msg.is_from_me && msg.push_name) existing.pushName = msg.push_name;
        if (new Date(msg.created_at) > new Date(existing.lastTimestamp)) {
          existing.lastTimestamp = msg.created_at;
          existing.lastMessage = msg.message_text || "[mídia]";
        }
      }
    });

    return [...map.values()].sort(
      (a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
    );
  }, [messages]);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) => c.pushName.toLowerCase().includes(q) || c.jid.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  return (
    <div className="flex h-screen bg-background">
      <div className="w-80">
        <InstanceSidebar instances={instances} selected={null} onSelect={() => {}} messageCounts={{}} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-3 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
            <Badge variant="secondary" className="text-xs">
              {contacts.length} contatos
            </Badge>
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((contact) => {
              const status = getStatus(contact.jid);
              return (
                <Card key={contact.jid} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {contact.pushName.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate text-foreground">{contact.pushName}</span>
                          <Badge
                            variant={status === "open" ? "default" : "secondary"}
                            className="text-xs px-1.5 py-0"
                          >
                            {status === "open" ? "Aberto" : "Finalizado"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{contact.jid.replace(/@.*/, "")}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {contact.totalMessages}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(contact.lastTimestamp), "dd/MM HH:mm")}
                          </span>
                        </div>
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {[...contact.instances].map((inst) => (
                            <Badge key={inst} variant="outline" className="text-xs px-1.5 py-0">
                              {inst}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Contacts;
