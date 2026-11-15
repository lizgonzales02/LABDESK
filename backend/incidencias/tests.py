from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Incidencia


class IncidenciaApiTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(username='soporte', password='ClaveSegura123!')
		self.token_response = self.client.post('/api/auth/token/', {
			'username': 'soporte',
			'password': 'ClaveSegura123!',
		}, format='json')
		self.token = self.token_response.data['token']
		self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
		self.incidencia = Incidencia.objects.create(
			titulo='PC no enciende',
			descripcion='El equipo no responde al botón de encendido.',
			categoria=Incidencia.Categoria.HARDWARE,
			prioridad=Incidencia.Prioridad.ALTA,
		)
		self.url = '/api/incidencias/'

	def test_login_issues_token(self):
		self.assertEqual(self.token_response.status_code, status.HTTP_200_OK)
		self.assertTrue(self.token)

	def test_login_rejects_invalid_password(self):
		response = self.client.post('/api/auth/token/', {
			'username': 'soporte',
			'password': 'incorrecta',
		}, format='json')

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

	def test_incidents_require_authentication(self):
		self.client.credentials()
		response = self.client.get(self.url)

		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

	def test_logout_revokes_token(self):
		response = self.client.post('/api/auth/logout/')
		self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

		response = self.client.get(self.url)
		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

	def test_list_and_filter_incidents(self):
		response = self.client.get(self.url, {'estado': 'pendiente', 'prioridad': 'alta'})

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data), 1)
		self.assertEqual(response.data[0]['titulo'], self.incidencia.titulo)

	def test_create_incident(self):
		fecha_limite = timezone.localdate() + timedelta(days=2)
		response = self.client.post(self.url, {
			'titulo': 'Python no abre',
			'descripcion': 'La aplicación muestra un error al iniciar.',
			'categoria': 'software',
			'prioridad': 'media',
			'estado': 'en_proceso',
			'responsable': 'soporte',
			'ubicacion': 'Laboratorio 2',
			'fecha_limite': fecha_limite.isoformat(),
		}, format='json')

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(Incidencia.objects.count(), 2)
		self.assertEqual(response.data['responsable'], 'soporte')
		self.assertEqual(response.data['ubicacion'], 'Laboratorio 2')
		self.assertEqual(response.data['fecha_limite'], fecha_limite.isoformat())

	def test_update_status_and_delete(self):
		detail_url = f'{self.url}{self.incidencia.pk}/'
		response = self.client.patch(detail_url, {'estado': 'resuelto'}, format='json')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.incidencia.refresh_from_db()
		self.assertEqual(self.incidencia.estado, Incidencia.Estado.RESUELTO)

		response = self.client.delete(detail_url)
		self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
		self.assertFalse(Incidencia.objects.exists())

	def test_reject_invalid_choice(self):
		response = self.client.post(self.url, {
			'titulo': 'Problema',
			'descripcion': 'Descripción',
			'categoria': 'otro',
			'prioridad': 'media',
			'estado': 'pendiente',
		}, format='json')

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

	def test_due_date_alerts_ignore_resolved_incidents(self):
		ayer = timezone.localdate() - timedelta(days=1)
		manana = timezone.localdate() + timedelta(days=1)
		vencida = Incidencia.objects.create(
			titulo='Vencida', descripcion='Pendiente', fecha_limite=ayer,
		)
		proxima = Incidencia.objects.create(
			titulo='Próxima', descripcion='Por vencer', fecha_limite=manana,
		)
		resuelta = Incidencia.objects.create(
			titulo='Resuelta', descripcion='Completada', fecha_limite=ayer,
			estado=Incidencia.Estado.RESUELTO,
		)
		response = self.client.get(self.url)
		alertas = {item['id']: item for item in response.data}

		self.assertTrue(alertas[vencida.id]['vencida'])
		self.assertFalse(alertas[vencida.id]['proxima_a_vencer'])
		self.assertFalse(alertas[proxima.id]['vencida'])
		self.assertTrue(alertas[proxima.id]['proxima_a_vencer'])
		self.assertFalse(alertas[resuelta.id]['vencida'])
		self.assertFalse(alertas[resuelta.id]['proxima_a_vencer'])

	def test_create_and_list_incident_comments(self):
		comments_url = f'{self.url}{self.incidencia.pk}/comentarios/'
		response = self.client.post(
			comments_url,
			{'contenido': 'Se revisó el equipo.'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(response.data['autor'], 'soporte')
		self.assertEqual(response.data['contenido'], 'Se revisó el equipo.')

		response = self.client.get(comments_url)
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data), 1)
