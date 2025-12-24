import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from './schemas/client.schema';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientsService {
  constructor(@InjectModel(Client.name) private clientModel: Model<ClientDocument>) {}

  async create(createClientDto: CreateClientDto): Promise<ClientDocument> {
    // Check if code already exists
    const existing = await this.clientModel.findOne({ code: createClientDto.code });
    if (existing) {
      throw new ConflictException('Client code already exists');
    }

    const client = new this.clientModel(createClientDto);
    return client.save();
  }

  async findAll(): Promise<ClientDocument[]> {
    return this.clientModel.find().exec();
  }

  async findById(id: string): Promise<ClientDocument> {
    const client = await this.clientModel.findById(id).exec();
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  async findByCode(code: string): Promise<ClientDocument> {
    const client = await this.clientModel.findOne({ code }).exec();
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }
}