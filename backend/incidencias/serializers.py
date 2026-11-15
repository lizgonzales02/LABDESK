from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import Comentario, Incidencia


class IncidenciaSerializer(serializers.ModelSerializer):
    vencida = serializers.SerializerMethodField()
    proxima_a_vencer = serializers.SerializerMethodField()

    class Meta:
        model = Incidencia
        fields = [
            'id', 'titulo', 'descripcion', 'categoria', 'prioridad', 'estado',
            'responsable', 'ubicacion', 'fecha_limite', 'creado_en',
            'vencida', 'proxima_a_vencer',
        ]
        read_only_fields = ['id', 'creado_en']

    def get_vencida(self, incidencia):
        return (
            incidencia.estado != Incidencia.Estado.RESUELTO
            and incidencia.fecha_limite is not None
            and incidencia.fecha_limite < timezone.localdate()
        )

    def get_proxima_a_vencer(self, incidencia):
        hoy = timezone.localdate()
        return (
            incidencia.estado != Incidencia.Estado.RESUELTO
            and incidencia.fecha_limite is not None
            and hoy <= incidencia.fecha_limite <= hoy + timedelta(days=1)
        )


class ComentarioSerializer(serializers.ModelSerializer):
    autor = serializers.CharField(source='autor.username', read_only=True)

    class Meta:
        model = Comentario
        fields = ['id', 'contenido', 'autor', 'creado_en']
        read_only_fields = ['id', 'autor', 'creado_en']