# Initial TF Conversion
import numpy as np
from PIL import Image, ImageOps
import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras.layers import Input, Dense, Conv2D, Activation, MaxPool2D
from tensorflow.keras.layers import BatchNormalization, Flatten, Reshape, Conv2DTranspose, LeakyReLU
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam, SGD
import numbers
import matplotlib.pyplot as plt
#%matplotlib inline
import torch.nn as nn
import torch.nn.functional as F
#from utils_AE_sf400 import *
import glob
import os

def get_padding(X,expected_size=(520,280)):
  print(X.shape[1])
  print(X.shape[2])
  widthCorrect = int((expected_size[1] - int(X.shape[2]))/2)
  heightCorrect = int((expected_size[0]-int(X.shape[1]))/2)
  return widthCorrect, heightCorrect

class CVAE(tf.keras.Model):
  """Convolutional variational autoencoder."""

  def __init__(self, latent_dim):
    super(CVAE, self).__init__()
    self.latent_dim = latent_dim
    self.encoder = tf.keras.Sequential(
        [
            tf.keras.layers.InputLayer(input_shape=(520, 280, 3)),
            tf.keras.layers.Conv2D(
                filters=32, kernel_size=3, padding='same', activation='relu'),
            tf.keras.layers.MaxPool2D(pool_size=(2,2),strides=(2,2)),
            tf.keras.layers.Conv2D(
                filters=64, kernel_size=3, padding='same', activation='relu'),
            tf.keras.layers.MaxPool2D(pool_size=(2,2),strides=(2,2)),
            tf.keras.layers.Conv2D(
                filters=128, kernel_size=3, padding='same', activation='relu'),
            tf.keras.layers.MaxPool2D(pool_size=(2,2),strides=(2,2)),
            tf.keras.layers.Flatten(),
            # No activation
            tf.keras.layers.Dense(65*35),
        ]
    )

    self.decoder = tf.keras.Sequential(
        [
            tf.keras.layers.InputLayer(input_shape=(65*35,)),
            tf.keras.layers.Dense(units=65*35*128, activation=tf.nn.relu),
            tf.keras.layers.Reshape(target_shape=(65, 35, 128)),
            tf.keras.layers.Conv2DTranspose(
                filters=64, kernel_size=2, strides=2,
                activation='relu'),
            tf.keras.layers.Conv2DTranspose(
                filters=32, kernel_size=2, strides=2,
                activation='relu'),
            # No activation
            tf.keras.layers.Conv2DTranspose(
                filters=3, kernel_size=2, strides=2,activation='sigmoid'),
        ]
    )

  def call(self,X):
    print(X.shape)
    widthCorrect, heightCorrect = get_padding(X=X)
    print(widthCorrect)
    print(heightCorrect)
    paddings = tf.constant([[0,0],[heightCorrect,heightCorrect],[widthCorrect,widthCorrect],[0,0]])
    print(paddings)
    X = tf.pad(X,paddings,"CONSTANT")
    X = self.encoder(X)
    X = self.decoder(X)
    return X
    
  @tf.function
  def sample(self, eps=None):
    if eps is None:
      eps = tf.random.normal(shape=(100, self.latent_dim))
    return self.decode(eps, apply_sigmoid=True)

  def encode(self, x):
    mean, logvar = tf.split(self.encoder(x), num_or_size_splits=2, axis=1)
    return mean, logvar

  def reparameterize(self, mean, logvar):
    eps = tf.random.normal(shape=mean.shape)
    return eps * tf.exp(logvar * .5) + mean

  def decode(self, z, apply_sigmoid=False):
    logits = self.decoder(z)
    if apply_sigmoid:
      probs = tf.sigmoid(logits)
      return probs
    return logits

optimizer = tf.keras.optimizers.Adam(1e-4)

autoencoder = CVAE(10)

autoencoder.compile(optimizer=optimizer, loss='binary_crossentropy')

input_shape=(1,520,280,3)

autoencoder.build(input_shape)

autoencoder.summary()


def log_normal_pdf(sample, mean, logvar, raxis=1):
  log2pi = tf.math.log(2. * np.pi)
  return tf.reduce_sum(
      -.5 * ((sample - mean) ** 2. * tf.exp(-logvar) + logvar + log2pi),
      axis=raxis)


def compute_loss(model, x):
  mean, logvar = model.encode(x)
  z = model.reparameterize(mean, logvar)
  x_logit = model.decode(z)
  cross_ent = tf.nn.sigmoid_cross_entropy_with_logits(logits=x_logit, labels=x)
  logpx_z = -tf.reduce_sum(cross_ent, axis=[1, 2, 3])
  logpz = log_normal_pdf(z, 0., 0.)
  logqz_x = log_normal_pdf(z, mean, logvar)
  return -tf.reduce_mean(logpx_z + logpz - logqz_x)


@tf.function
def train_step(model, x, optimizer):
  """Executes one training step and returns the loss.

  This function computes the loss and gradients, and uses the latter to
  update the model's parameters.
  """
  with tf.GradientTape() as tape:
    loss = compute_loss(model, x)
  gradients = tape.gradient(loss, model.trainable_variables)
  optimizer.apply_gradients(zip(gradients, model.trainable_variables))

def padding(img,expected_size = (280,520)):
    desired_size_w = expected_size[0]
    desired_size_h = expected_size[1]
    #delta_width = desired_size_w - img.size[0]
    #delta_height = desired_size_h - img.size[1]
    #pad_width = delta_width //2
    #pad_height = delta_height //2
    #padding = (pad_width,pad_height,delta_width-pad_width,delta_height-pad_height)
    #return ImageOps.expand(img, padding)
    return ImageOps.pad(img,expected_size)

def main():
    source = '/Users/soma/Desktop/WebgenThings/training_downsampled_tif_scalefactor_400/'
    
    train_fol = source + 'training'
    test_fol = source + 'test'
    
    img_trains = [f for f in glob.glob(os.path.join(source, '*tif'))]
    img_test = [f for f in glob.glob(os.path.join(test_fol, '*tif'))]

    image_paths = tf.convert_to_tensor(img_trains, dtype=tf.string)

    dataset = tf.data.Dataset.from_tensor_slices((image_paths))

    ## incoporate padding here?? https://stackoverflow.com/questions/44416764/loading-folders-of-images-in-tensorflow
    


        
if __name__=='__main__':
    main()
