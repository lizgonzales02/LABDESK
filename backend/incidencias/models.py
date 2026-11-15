from django.db import models


class Incidencia(models.Model):
	class Categoria(models.TextChoices):
		HARDWARE = 'hardware', 'Hardware'
		SOFTWARE = 'software', 'Software'
		RED = 'red', 'Red / Internet'

	class Prioridad(models.TextChoices):
		BAJA = 'baja', 'Baja'
		MEDIA = 'media', 'Media'
		ALTA = 'alta', 'Alta'

	class Estado(models.TextChoices):
		PENDIENTE = 'pendiente', 'Pendiente'
		EN_PROCESO = 'en_proceso', 'En proceso'
		RESUELTO = 'resuelto', 'Resuelto'

	titulo = models.CharField(max_length=120)
	descripcion = models.TextField()
	categoria = models.CharField(max_length=20, choices=Categoria.choices, default=Categoria.HARDWARE)
	prioridad = models.CharField(max_length=10, choices=Prioridad.choices, default=Prioridad.MEDIA)
	estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.PENDIENTE)
	responsable = models.CharField(max_length=100, blank=True)
	ubicacion = models.CharField(max_length=120, blank=True)
	fecha_limite = models.DateField(null=True, blank=True)
	creado_en = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-creado_en']

	def __str__(self):
		return self.titulo


class Comentario(models.Model):
	incidencia = models.ForeignKey(Incidencia, related_name='comentarios', on_delete=models.CASCADE)
	autor = models.ForeignKey('auth.User', on_delete=models.PROTECT)
	contenido = models.TextField(max_length=2000)
	creado_en = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['creado_en']

	def __str__(self):
		return f'Comentario de {self.autor} en {self.incidencia}'
