import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface EmailHistoryItem {
  id: string;
  created_at: string;
  subject: string;
  recipient_email: string;
  recipient_name: string | null;
  status: string;
  from_address: string;
}

export const EmailHistory = () => {
  const [history, setHistory] = useState<EmailHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('email_history_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_history'
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('email_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching email history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="p-8">
        <p className="text-center text-muted-foreground">No email history yet. Send your first email!</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Email History</h2>
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{item.subject}</h3>
                    <Badge variant={item.status === 'success' ? 'default' : 'destructive'}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="truncate">
                      To: {item.recipient_name ? `${item.recipient_name} <${item.recipient_email}>` : item.recipient_email}
                    </p>
                    <p className="truncate">From: {item.from_address}</p>
                    <p className="text-xs">
                      {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
