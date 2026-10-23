import React, { useState } from 'react';
import { Header } from '../components/Header';
import {
  Search,
  Calendar,
  Filter,
  Download,
  CheckCircle,
  ChevronDown,
  HandMetal,
  MessageCircle,
  GraduationCap
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const historyItems = [
    {
      group: 'TODAY',
      entries: [
        {
          id: '1',
          title: 'Asking for Directions',
          mode: 'ISL to English',
          time: '11:45 AM',
          snippet: '“Hello, could you tell me how to reach the nearest metro station?”',
          icon: HandMetal,
          iconBg: 'bg-[#7C9CFF]/20 text-[#7C9CFF]',
        },
      ],
    },
    {
      group: 'YESTERDAY',
      entries: [
        {
          id: '2',
          title: 'Doctor Appointment',
          mode: 'Hindi to ISL',
          time: '04:20 PM',
          snippet: '“The doctor mentioned that the results will be ready by next week...”',
          icon: MessageCircle,
          iconBg: 'bg-[#FFE8E2] text-[#FF8A8A]',
        },
        {
          id: '3',
          title: 'Practice Session: Greetings',
          mode: 'ISL Learning',
          time: '09:15 AM',
          snippet: 'Learned 5 new signs today: Hello, Thank You, Sorry, Please, Good Morning.',
          icon: GraduationCap,
          iconBg: 'bg-[#E5F8E2] text-[#65B75D]',
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <Header
        title="Conversation History"
        subtitle="Review and manage your past translations."
      />

      {/* Export / Sync Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 border border-slate-200/50 text-xs font-bold text-[#2B2D42] shadow-sm">
          <CheckCircle className="w-3.5 h-3.5 text-[#A8E6A1]" />
          <span>ALL SYNCED</span>
        </div>

        <button
          type="button"
          className="clay-button clay-button-white px-4 py-2 text-xs font-black flex items-center gap-2 clay-focus"
          title="Export History"
        >
          <Download className="w-4 h-4 text-[#7C9CFF]" />
          <span>Export Records</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search conversations or keywords..."
            className="clay-input w-full pl-11 text-xs font-bold"
          />
          <Search className="w-4 h-4 text-[#6E7387] absolute left-4 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="clay-button clay-button-white px-4 py-3 text-xs font-extrabold flex items-center gap-2 clay-focus"
          >
            <Calendar className="w-4 h-4 text-[#7C9CFF]" />
            <span>Last 30 Days</span>
          </button>

          <button
            type="button"
            className="clay-button clay-button-white px-4 py-3 text-xs font-extrabold flex items-center gap-2 clay-focus"
          >
            <Filter className="w-4 h-4 text-[#7C9CFF]" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* History Items Groups */}
      <div className="space-y-6 pt-2">
        {historyItems.map((group) => (
          <div key={group.group} className="space-y-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#6E7387]">
              {group.group}
            </span>

            <div className="space-y-3">
              {group.entries.map((item) => (
                <div
                  key={item.id}
                  className="clay-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:-translate-y-0.5 transition-transform"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.iconBg} shrink-0`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-sm text-[#2B2D42]">{item.title}</h4>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-[#6E7387]">
                          {item.mode}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#6E7387] italic mt-1">
                        {item.snippet}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-black text-[#6E7387] shrink-0 self-end sm:self-auto">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      <div className="text-center pt-6">
        <button
          type="button"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#6E7387] hover:text-[#2B2D42] py-2 px-4 rounded-xl clay-focus"
        >
          <span>Load Older Conversations</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
