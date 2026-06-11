import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Zap, 
  Mail, 
  Phone, 
  BookOpen, 
  Calendar, 
  Search,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  Clock,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  status: string;
  created_at: string;
}

export function LeadManagement() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://loyola-lms.onrender.com'}/api/data/leads`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://loyola-lms.onrender.com'}/api/leads/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        toast.success(`Status updated to ${status}`);
        fetchLeads();
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone.includes(searchTerm) ||
    lead.course.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-[#FD5A1A] flex-shrink-0" />
            Landing Page leads
          </h2>
          <p className="text-slate-500 text-xs sm:text-base">Manage inquiries from potential students</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchLeads} 
            className="rounded-xl bg-white shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search leads by name, email, or course..." 
            className="pl-10 h-11 rounded-xl bg-white border-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="rounded-xl h-11">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Identity</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Target Path</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Submission Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-slate-100 rounded w-full" /></td>
                    </tr>
                  ))
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-bold italic">
                      No leads found in the repository
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-900">{lead.name}</span>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1 cursor-pointer hover:text-primary"><Mail className="w-3 h-3" /> {lead.email}</span>
                            <span className="flex items-center gap-1 cursor-pointer hover:text-primary"><Phone className="w-3 h-3" /> {lead.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <Badge variant="outline" className="bg-blue-50/50 text-[#0075CF] border-blue-100 font-bold px-3 py-1 rounded-lg">
                          <BookOpen className="w-3 h-3 mr-2" />
                          {lead.course}
                        </Badge>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center text-slate-500 text-xs font-medium">
                          <Calendar className="w-3.5 h-3.5 mr-2 opacity-40" />
                          {new Date(lead.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <Badge className={`
                          rounded-full px-3 py-1 font-bold text-[10px] uppercase tracking-wider
                          ${lead.status === 'new' ? 'bg-orange-500 text-white' : 
                            lead.status === 'contacted' ? 'bg-blue-500 text-white' : 
                            'bg-emerald-500 text-white'}
                        `}>
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                              <MoreVertical className="w-4 h-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-2xl border-slate-100">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Lead Life-cycle</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="rounded-xl px-3 h-10 font-bold focus:bg-slate-900 focus:text-white transition-colors cursor-pointer" onClick={() => updateStatus(lead.id, 'contacted')}>
                              <Clock className="w-4 h-4 mr-3 opacity-40" /> Mark Contacted
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-xl px-3 h-10 font-bold focus:bg-slate-900 focus:text-white transition-colors cursor-pointer" onClick={() => updateStatus(lead.id, 'enrolled')}>
                              <CheckCircle2 className="w-4 h-4 mr-3 opacity-40" /> Mark Enrolled
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="rounded-xl px-3 h-10 font-bold text-rose-600 focus:bg-slate-900 focus:text-white transition-colors cursor-pointer">
                               Archive Lead
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}