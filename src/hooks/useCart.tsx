import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const isStoraged = cart.map((item) => item.id).includes(productId);
      await api.get(`/stock/${productId}`).then(async (item) => {
        const stock: Stock = item.data;
        if (isStoraged) {
          const product = cart
            .filter((r) => r.id === productId)
            .reduce((i) => i);
          if (product.amount < stock.amount) {
            const newArray = cart.map((i) => {
              if (i.id === productId) {
                i.amount += 1;
              }
              return i;
            });
            setCart([...newArray]);
            const updatedCart = JSON.stringify(cart);
            localStorage.setItem('@RocketShoes:cart', updatedCart);
          } else {
            toast.error('Quantidade solicitada fora de estoque');
            return;
          }
        } else {
          await api.get(`/products/${productId}`).then((res) => {
            const newCart = [{ ...res.data, amount: 1 }, ...cart];
            localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
            setCart(newCart);
          });
        }
      });
    } catch (error) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (cart.filter((i) => i.id === productId).length) {
        const products = cart.filter((r) => r.id !== productId);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));
        setCart([...products]);
      } else {
        toast.error('Erro na remoção do produto');
        return;
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      await api.get(`/stock/${productId}`).then(async (item) => {
        const stock: Stock = item.data;
        if (amount <= stock.amount && amount > 0) {
          const products = cart.map((i) => {
            if (i.id === productId) {
              i.amount = amount;
            }
            return i;
          });
          setCart([...products]);
          const updatedCart = JSON.stringify(cart);
          localStorage.setItem('@RocketShoes:cart', updatedCart);
        } else {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
      });
    } catch (error) {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
