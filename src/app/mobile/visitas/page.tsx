"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar as CalendarIcon, Clock, MapPin, ExternalLink, CheckCircle } from "lucide-react";

interface Appointment {
  id: string;
  title: string;
  appointment_date: string;
  status: string;
  notes?: string;
  clients?: {
    company_name?: string;
    name: string;
    city?: string;
  } | {
    company_name?: string;
    name: string;
    city?: string;
  }[] | null;
}

export default function MobileVisitasPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          title,
          appointment_date,
          status,
          notes,
          clients (
            company_name,
            name,
            city
          )
        `)
        .order("appointment_date", { ascending: true });

      if (error) throw error;
      if (data) setAppointments(data as unknown as Appointment[]);
    } catch (error) {
      console.error("Erro ao buscar visitas:", error);
    } finally {
      setLoading(false);
    }
  }

  // Gera link dinâmico para salvar no Google Agenda pessoal
  function getGoogleCalendarUrl(app: Appointment) {
    const title = encodeURIComponent(`Visita: ${app.title}`);
    const details = encodeURIComponent(app.notes || `Visita comercial agendada via App Capilar.`);
    
    // Tratativa segura para extrair dados do cliente caso venha como array ou objeto
    const clientData = Array.isArray(app.clients) ? app.clients[0] : app.clients;
    const location = encodeURIComponent(clientData?.city || "Salão Parceiro");
    
    const dateObj = new Date(app.appointment_date);
    const startIso = dateObj.toISOString().replace(/-|:|\.\d\d\d/g, "");
    dateObj.setHours(dateObj.getHours() + 1);
    const endIso = dateObj.toISOString().replace(/-|:|\.\d\d\d/g, "");

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      {/* Header Fixo */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">Agenda de Visitas</h1>
        <p className="text-xs text-gray-500">Compromissos comerciais em salões parceiros</p>
      </div>

      <div className="p-4 flex-1">
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Carregando agenda...</div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">Nenhuma visita agendada.</div>
        ) : (
          <div className="space-y-3">
            {appointments.map((item) => {
              const dateFormatted = new Date(item.appointment_date).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              });

              const clientData = Array.isArray(item.clients) ? item.clients[0] : item.clients;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">{item.title}</h2>
                      {clientData && (
                        <p className="text-xs text-pink-600 font-semibold mt-0.5">
                          {clientData.company_name || clientData.name}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                        item.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : item.status === "canceled"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.status === "completed" ? "Concluída" : item.status === "canceled" ? "Cancelada" : "Pendente"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-600 pt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span>{dateFormatted}</span>
                    </div>
                    {clientData?.city && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        <span>{clientData.city}</span>
                      </div>
                    )}
                  </div>

                  {item.notes && (
                    <p className="text-xs bg-gray-50 p-2 rounded-lg text-gray-600 border border-gray-100">
                      {item.notes}
                    </p>
                  )}

                  {/* Botão de integração com Google Agenda */}
                  <div className="pt-2 border-t border-gray-50 flex justify-end">
                    <a
                      href={getGoogleCalendarUrl(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-pink-600 font-semibold hover:text-pink-700 bg-pink-50 hover:bg-pink-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Adicionar ao Google Agenda
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}