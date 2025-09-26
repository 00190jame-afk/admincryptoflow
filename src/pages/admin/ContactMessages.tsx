import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Mail, Search, MessageSquare, Eye, Trash2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useNotifications } from '@/contexts/NotificationContext';

interface ContactMessage {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

const ContactMessages = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [assignedEmails, setAssignedEmails] = useState<string[]>([]);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { isSuperAdmin, assignedUserIds, loading: adminLoading } = useAdminRole();
  const { markAsRead } = useNotifications();

  useEffect(() => {
    if (!adminLoading) {
      fetchAssignedEmails();
      fetchContactMessages();
      
      // Mark contact messages as read when component loads
      markAsRead('contactMessages');
      
      // Set up real-time subscription for new contact messages
      const contactChannel = supabase
        .channel('contact-messages-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'contact_messages'
          },
          (payload) => {
            console.log('New contact message received:', payload.new);
            setMessages((prevMessages) => [payload.new as ContactMessage, ...prevMessages]);
            // Mark this message as new for highlighting
            setNewMessageIds((prev) => new Set([...prev, payload.new.id]));
            // Auto-remove the highlight after 30 seconds
            setTimeout(() => {
              setNewMessageIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(payload.new.id);
                return newSet;
              });
            }, 30000);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(contactChannel);
      };
    }
  }, [adminLoading, isSuperAdmin, assignedUserIds, markAsRead]);

  const fetchAssignedEmails = async () => {
    if (isSuperAdmin || assignedUserIds.length === 0) {
      setAssignedEmails([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .in('user_id', assignedUserIds)
        .not('email', 'is', null);

      if (error) throw error;
      setAssignedEmails(data?.map(p => p.email).filter(Boolean) || []);
    } catch (error) {
      console.error('Error fetching assigned emails:', error);
      setAssignedEmails([]);
    }
  };

  const fetchContactMessages = async (retryCount = 0) => {
    try {
      let query = supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter contact messages for regular admins to only show messages from assigned users
      if (!isSuperAdmin) {
        if (assignedEmails.length > 0) {
          query = query.in('email', assignedEmails);
        } else {
          // Regular admin with no assigned users should see no data
          query = query.eq('email', 'no-email@nonexistent.com');
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching contact messages:', error);
      
      // Retry up to 2 times with delay for network issues
      if (retryCount < 2 && error.message?.includes('Failed to fetch')) {
        console.log(`Retrying fetch contact messages, attempt ${retryCount + 1}`);
        setTimeout(() => fetchContactMessages(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to load contact messages. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setMessages(messages.filter(m => m.id !== id));
      toast({
        title: "Success",
        description: "Message deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const filteredMessages = messages.filter(message =>
    message.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Contact Messages</h1>
        <p className="text-muted-foreground">
          Manage and respond to customer contact messages
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messages.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Messages</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {messages.filter(m => 
                new Date(m.created_at).toDateString() === new Date().toDateString()
              ).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {messages.filter(m => {
                const messageDate = new Date(m.created_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return messageDate > weekAgo;
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Contacts</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(messages.map(m => m.email)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Contact Messages</CardTitle>
          <CardDescription>
            View and manage customer inquiries and feedback
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Message Preview</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading contact messages...
                  </TableCell>
                </TableRow>
              ) : filteredMessages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No contact messages found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMessages.map((message) => (
                  <TableRow 
                    key={message.id}
                    className={newMessageIds.has(message.id) ? "bg-red-50 border-red-200 animate-pulse" : ""}
                  >
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        {new Date(message.created_at).toLocaleDateString()}
                        {newMessageIds.has(message.id) && (
                          <Badge variant="destructive" className="text-xs animate-bounce">
                            <Sparkles className="h-3 w-3 mr-1" />
                            NEW
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{message.first_name} {message.last_name}</div>
                      </div>
                    </TableCell>
                    <TableCell>{message.email}</TableCell>
                    <TableCell className="font-medium">{message.subject}</TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate text-sm text-muted-foreground">
                        {message.message}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedMessage(message)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Contact Message Details</DialogTitle>
                              <DialogDescription>
                                From {selectedMessage?.first_name} {selectedMessage?.last_name}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedMessage && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">Name</label>
                                    <p>{selectedMessage.first_name} {selectedMessage.last_name}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Email</label>
                                    <p>{selectedMessage.email}</p>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Subject</label>
                                  <p>{selectedMessage.subject}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Message</label>
                                  <div className="mt-2 p-4 bg-muted rounded-lg">
                                    <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Received At</label>
                                  <p>{new Date(selectedMessage.created_at).toLocaleString()}</p>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteMessage(message.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactMessages;