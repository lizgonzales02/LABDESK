from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Comentario, Incidencia
from .serializers import ComentarioSerializer, IncidenciaSerializer


class LogoutView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		request.user.auth_token.delete()
		return Response(status=status.HTTP_204_NO_CONTENT)


class IncidenciaViewSet(viewsets.ModelViewSet):
	queryset = Incidencia.objects.all()
	serializer_class = IncidenciaSerializer
	filter_backends = [SearchFilter]
	search_fields = ['titulo', 'descripcion']

	def get_queryset(self):
		queryset = super().get_queryset()
		estado = self.request.query_params.get('estado')
		prioridad = self.request.query_params.get('prioridad')

		if estado and estado != 'todos':
			queryset = queryset.filter(estado=estado)
		if prioridad and prioridad != 'todas':
			queryset = queryset.filter(prioridad=prioridad)

		return queryset

	@action(detail=True, methods=['get', 'post'], url_path='comentarios')
	def comentarios(self, request, pk=None):
		incidencia = self.get_object()
		if request.method == 'GET':
			comentarios = incidencia.comentarios.select_related('autor').all()
			return Response(ComentarioSerializer(comentarios, many=True).data)

		serializer = ComentarioSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		comentario = serializer.save(incidencia=incidencia, autor=request.user)
		return Response(ComentarioSerializer(comentario).data, status=status.HTTP_201_CREATED)
