from django.contrib import admin

from .models import Comentario, Incidencia


@admin.register(Incidencia)
class IncidenciaAdmin(admin.ModelAdmin):
	list_display = ['titulo', 'categoria', 'prioridad', 'estado', 'responsable', 'fecha_limite', 'creado_en']
	list_filter = ['categoria', 'prioridad', 'estado']
	search_fields = ['titulo', 'descripcion', 'responsable', 'ubicacion']


@admin.register(Comentario)
class ComentarioAdmin(admin.ModelAdmin):
	list_display = ['incidencia', 'autor', 'creado_en']
	search_fields = ['incidencia__titulo', 'autor__username', 'contenido']
